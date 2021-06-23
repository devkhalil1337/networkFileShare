(function(angular) {
    'use strict';
    angular.module('FileManagerApp').controller('FileManagerCtrl', [
        '$scope', '$rootScope', '$window', '$translate', 'fileManagerConfig', 'item', 'fileNavigator', 'apiMiddleware',
        function($scope, $rootScope, $window, $translate, fileManagerConfig, Item, FileNavigator, ApiMiddleware) {
        $scope.user = "admin";

        var $storage = $window.localStorage;
        $scope.config = fileManagerConfig;
        $scope.reverse = false;
        $scope.filesSortBy = 'model.attachmentNumber';
        $scope.predicate = ['model.fileType', 'model.fileName'];
        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate[1] === predicate) ? !$scope.reverse : false;
            $scope.predicate[1] = predicate;
        };
        $scope.query = '';
        $scope.fileNavigator = new FileNavigator();
        $scope.apiMiddleware = new ApiMiddleware();
        $scope.uploadFileList = [];
        $scope.viewTemplate = $storage.getItem('viewTemplate') || 'main-icons.html';
        $scope.fileList = [];
        $scope.temps = [];

        $scope.$watch('temps', function() {
            if ($scope.singleSelection()) {
                $scope.temp = $scope.singleSelection();
            } else {
                $scope.temp = new Item({rights: 644});
                $scope.temp.multiple = true;
            }
            $scope.temp.revert();
        });

        $scope.fileNavigator.onRefresh = function() {
            $scope.temps = [];
            $scope.query = '';
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
        };

        $scope.setTemplate = function(name) {
            $storage.setItem('viewTemplate', name);
            $scope.viewTemplate = name;
        };

        $scope.changeLanguage = function (locale) {
            if (locale) {
                $storage.setItem('language', locale);
                return $translate.use(locale);
            }
            $translate.use($storage.getItem('language') || fileManagerConfig.defaultLang);
        };

        $scope.isSelected = function(item) {
            return $scope.temps.indexOf(item) !== -1;
        };

        $scope.moveSelectedFileOrFolder = (item, $event) => {
            if($scope.isTrashPath())
                return;
            if(!$scope.temps || $scope.temps.length == 0 || item.model.isFile)
                return;
                $scope.modal('movefile');
                $scope.temps.itemTo = item;
        }

        $scope.moveFile = function(){
            let item = $scope.temps;
            if(!item || !item.itemTo || item.itemTo.length == 0){
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_be_file');
                return;
            }
            let itemTo = item.itemTo;
            $scope.apiMiddleware.moveFileOrDirectory($scope.temps,itemTo).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('movefile', true);
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        }

        $scope.recoverFile = function(){
            let item = $scope.temps;
            $scope.apiMiddleware.recoverFile(item).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('restoreFile', true);
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        }

        $scope.selectOrUnselect = function(item, $event) {
            var indexInTemp = $scope.temps.indexOf(item);
            var isRightClick = $event && $event.which == 3;

            if ($event && $event.target.hasAttribute('prevent')) {
                $scope.temps = [];
                return;
            }
            if (! item || (isRightClick && $scope.isSelected(item))) {
                return;
            }
            if ($event && $event.shiftKey && !isRightClick) {
                var list = $scope.fileList;
                var indexInList = list.indexOf(item);
                var lastSelected = $scope.temps[0];
                var i = list.indexOf(lastSelected);
                var current = undefined;
                if (lastSelected && list.indexOf(lastSelected) < indexInList) {
                    $scope.temps = [];
                    while (i <= indexInList) {
                        current = list[i];
                        !$scope.isSelected(current) && $scope.temps.push(current);
                        i++;
                    }
                    return;
                }
                if (lastSelected && list.indexOf(lastSelected) > indexInList) {
                    $scope.temps = [];
                    while (i >= indexInList) {
                        current = list[i];
                        !$scope.isSelected(current) && $scope.temps.push(current);
                        i--;
                    }
                    return;
                }
            }
            if ($event && !isRightClick && ($event.ctrlKey || $event.metaKey)) {
                $scope.isSelected(item) ? $scope.temps.splice(indexInTemp, 1) : $scope.temps.push(item);
                return;
            }
            item.model.fileReceivedDate = item.model.fileReceivedDate ? new Date(item.model.fileReceivedDate): item.model.fileUploadDate ? new Date(item.model.fileUploadDate):'';
            $scope.temps = [item];
        };

        $scope.singleSelection = function() {
            return $scope.temps.length === 1 && $scope.temps[0];
        };

        $scope.totalSelecteds = function() {
            return {
                total: $scope.temps.length
            };
        };

        $scope.selectionHas = function(type) {
            return $scope.temps.find(function(item) {
                return item && item.model.fileType === type;
            });
        };

        $scope.prepareNewFolder = function() {
            var item = new Item(null, $scope.fileNavigator.currentPath);
            $scope.temps = [item];
            return item;
        };

        $scope.smartClick = function(item) {
            if($scope.isTrashPath())
                return;
            var pick = $scope.config.allowedActions.pickFiles;
            // console.log('pick', pick);
            if (item.isFolder()) {
                return $scope.fileNavigator.folderClick(item);
            }

            if (typeof $scope.config.pickCallback === 'function' && pick) {
                var callbackSuccess = $scope.config.pickCallback(item.model);
                if (callbackSuccess === true) {
                    return;
                }
            }

            if (item.isImage()) {
                if ($scope.config.previewImagesInModal) {
                    return $scope.openImagePreview(item);
                }
                return $scope.apiMiddleware.download(item, true);
            }

            if (item.isEditable()) {
                return $scope.openEditItem(item);
            }
        };

        $scope.openImagePreview = function() {
            $scope.count = 0;
            let filesToDisplay = $scope.fileNavigator.fileList.filter(item => item.model.isFile && (item.model.extension == "jpg" || item.model.extension == "pdf" ));
            if(!filesToDisplay || filesToDisplay.length == 0)
                return;
            let _item = filesToDisplay[0];
            $scope.fileslist = filesToDisplay;
            $scope.getContent(_item);
        };
        $scope.nextFile = function(){
            if($scope.count == $scope.fileslist.length-1)
                return;
            $scope.count++;
            $scope.getContent();
        }
        $scope.prevFile = function(){
            if($scope.count == 0)
                return;
            $scope.count--;
            $scope.getContent();
        }

        $scope.downloadSingleFile = function(){
            return $scope.apiMiddleware.downloadSingleFile($scope.fileslist[$scope.count])
        }

        $scope.getContent = function() {
            
            let _item = $scope.fileslist[$scope.count];
            return $scope.apiMiddleware.getContent(_item).then(response => {
                let type = 'image/jpg';
                if(_item.model.fileName.indexOf("pdf") > 0)
                    type = 'application/pdf';
                var blob = new Blob([response], {type: type});
                var url = URL.createObjectURL(blob);

                let fileType = "pdfpreview-target";
                if((type).indexOf("image") > -1){
                    fileType = "imagepreview-target";
                }

                $scope.fileSrc = url;
            //    $scope.apiMiddleware.apiHandler.inprocess = true;
            $scope.modal('imagepreview', null, true)
                // .find('#'+fileType)
                // .attr('src', url)
                // .unbind('load error')
                // .on('load error', function() {
                //     $scope.apiMiddleware.apiHandler.inprocess = false;
                //     $scope.$apply();
                // });
            });
            
        };

        $scope.openEditItem = function() {
            $scope.selectedItem = angular.copy($scope.singleSelection());
            let attachmentNumber = $scope.fileNavigator.fileList.filter(item => item.model.isFile && item.model.attachmentNumber).length;
            if(!attachmentNumber){
                attachmentNumber = 1;
            }
            $scope.selectedItem.maxAttachmentNumber = attachmentNumber
            $scope.modal('editFile');
        };

        $scope.editItem = function() {
            var item = $scope.selectedItem;
            $scope.apiMiddleware.editFile(item).then(function(data) {
                $scope.fileNavigator.refresh();
                $scope.modal('editFile', true);
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.isTrashPath = function(){
            let currentPath = $scope.fileNavigator.currentPath;
            if(currentPath && currentPath.length > 0) 
                return currentPath[currentPath.length-1].toLowerCase() == "trash"
        }

        $scope.isTrashFolder = function(){
            if($scope.isTrashPath()){
                console.log("it is trash folder");
                $scope.config.allowedActions.remove = $scope.user == "admin";
            }else{
                $scope.config.allowedActions.remove = true;
            }
            return ($scope.singleSelection() && ($scope.singleSelection().tempModel.fileName == 'Trash' || $scope.singleSelection().tempModel.fileName == 'trash'))
        }

        $scope.modal = function(id, hide, returnElement) {
            var element = angular.element('#' + id);
            element.modal(hide ? 'hide' : 'show');
            $scope.apiMiddleware.apiHandler.error = '';
            $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            return returnElement ? element : true;
        };

        $scope.modalWithPathSelector = function(id) {
            $rootScope.selectedModalPath = $scope.fileNavigator.currentPath;
            return $scope.modal(id);
        };

        $scope.isInThisPath = function(path) {
            var currentPath = typeof $scope.fileNavigator.currentPath == "string" ? $scope.fileNavigator.currentPath + '/': $scope.fileNavigator.currentPath.join('/') + '/';
            return currentPath.indexOf(path + '/') !== -1;
            // return $scope.fileNavigator.currentPath.indexOf(path + '/') !== -1;
        };

        $scope.edit = function() {
            $scope.apiMiddleware.edit($scope.singleSelection()).then(function() {
                $scope.modal('edit', true);
            });
        };

        $scope.changePermissions = function() {
            $scope.apiMiddleware.changePermissions($scope.temps, $scope.temp).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('changepermissions', true);
            });
        };

        // $scope.download = function() {
        //     var item = $scope.singleSelection();
        //     if ($scope.selectionHas('dir')) {
        //         return;
        //     }
        //     if (item) {
        //         return $scope.apiMiddleware.download(item);
        //     }
        //     return $scope.apiMiddleware.downloadMultiple($scope.temps);
        // };

        $scope.copy = function() {
            var item = $scope.singleSelection();
            if (item) {
                var name = item.tempModel.name.trim();
                var nameExists = $scope.fileNavigator.fileNameExists(name);
                if (nameExists && validateSamePath(item)) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
                if (!name) {
                    $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                    return false;
                }
            }
            $scope.apiMiddleware.copy($scope.temps, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('copy', true);
            });
        };

        $scope.compress = function() {
            var name = $scope.temp.tempModel.name.trim();
            var nameExists = $scope.fileNavigator.fileNameExists(name);

            if (nameExists && validateSamePath($scope.temp)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            if (!name) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }

            $scope.apiMiddleware.compress($scope.temps, name, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                if (! $scope.config.compressAsync) {
                    return $scope.modal('compress', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.extract = function() {
            var item = $scope.temp;
            var name = $scope.temp.tempModel.name.trim();
            var nameExists = $scope.fileNavigator.fileNameExists(name);

            if (nameExists && validateSamePath($scope.temp)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            if (!name) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }

            $scope.apiMiddleware.extract(item, name, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                if (! $scope.config.extractAsync) {
                    return $scope.modal('extract', true);
                }
                $scope.apiMiddleware.apiHandler.asyncSuccess = true;
            }, function() {
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.remove = function() {
            $scope.apiMiddleware.remove($scope.temps).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('remove', true);
            });
        };

        $scope.download = function() {
            var anyItem = $scope.singleSelection() || $scope.temps[0];
            if (!anyItem || anyItem.isFolder()) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_be_file');
                return false;
            }
            $scope.fileNavigator.requesting = true;
            $scope.apiMiddleware.download($scope.temps,$scope.fileNavigator).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('download', true);
                $scope.fileNavigator.requesting = false;
            }, function() {
                $scope.fileNavigator.requesting = false;
                $scope.apiMiddleware.apiHandler.asyncSuccess = false;
            });
        };

        $scope.move = function() {
            var anyItem = $scope.singleSelection() || $scope.temps[0];
            if (anyItem && validateSamePath(anyItem)) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_cannot_move_same_path');
                return false;
            }
            $scope.apiMiddleware.move($scope.temps, $rootScope.selectedModalPath).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('move', true);
            });
        };

        $scope.rename = function() {
            var item = $scope.singleSelection();
            var name = item.tempModel.name;
            var samePath = item.tempModel.path.join('') === item.model.path.join('');
            if (!name || (samePath && $scope.fileNavigator.fileNameExists(name))) {
                $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
                return false;
            }
            $scope.apiMiddleware.rename(item).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('rename', true);
            });
        };

        $scope.createFolder = function() {
            var item = $scope.singleSelection();
            var fileName = item.tempModel.fileName;
            if (!fileName || $scope.fileNavigator.fileNameExists(fileName)) {
                return $scope.apiMiddleware.apiHandler.error = $translate.instant('error_invalid_filename');
            }
            $scope.apiMiddleware.createFolder(item).then(function() {
                $scope.fileNavigator.refresh();
                $scope.modal('newfolder', true);
            });
        };

        $scope.addForUpload = function($files) {
            if(!$files || $files.length == 0)
                return;
            let attachmentNumber = $scope.fileNavigator.fileList.filter(item => item.model.isFile && item.model.attachmentNumber).length;
            if(!attachmentNumber){
                attachmentNumber = 1;
            }
            let uploadFileList = $scope.uploadFileList;
            if(uploadFileList && uploadFileList.length > 0){
                let lastAttachmentNumber = uploadFileList[uploadFileList.length - 1 ].attachmentNumber;
                attachmentNumber = lastAttachmentNumber ? lastAttachmentNumber:1;
            }
            $files = $files.map((fileObj,index) =>
            {
                fileObj.description = '';
                fileObj.fileType = '';
                fileObj.maxAttachmentNumber = attachmentNumber+index;
                fileObj.attachmentNumber = attachmentNumber+index;
                fileObj.extension = fileObj.name.split('.').pop();
                fileObj.fileReceivedDate = new Date(); 
                return fileObj;
            });
            if($files && $files.length > 0)
                $scope.uploadFileList = [...$files, ...$scope.uploadFileList]
            $scope.modal('uploadfile');
        };

        $scope.removeFromUpload = function(index) {
            $scope.uploadFileList.splice(index, 1);
        };

        $scope.uploadFiles = async function() {
            let promises = []
            let isErrorFound = false;
            $scope.uploadFileList.forEach(function(uploadFileList, index, array) {
                promises.push($scope.apiMiddleware.upload(uploadFileList, $scope.fileNavigator.currentPath).then(function(response) {
                    console.log("Success", response);
                    $scope.uploadFileList[index].error = false;
                }, function(response) {
                    console.log(response);
                    if(response && response.data && response.data.description){
                        isErrorFound = true;
                        $scope.uploadFileList[index].error = true;
                        $scope.apiMiddleware.apiHandler.error = response.data.description;
                        $scope.uploadFileList[index].errorMessage = response.data.description;
                    }else{
                        $scope.uploadFileList[index].error = false;
                    }
                }));
            });
            await Promise.allSettled(promises);
            if(isErrorFound) {
                $scope.fileNavigator.refresh();
            } else {
                $scope.apiMiddleware.apiHandler.inprocess = false;
                $scope.apiMiddleware.apiHandler.progress = 0;
                $scope.modal('uploadfile', true);
                $scope.uploadFileList = [];
                $scope.fileNavigator.refresh();
            }
        };

        $scope.cancelUploadFiles = function() {
                $scope.apiMiddleware.abortUpload();
                $scope.uploadFileList = [];
            // $scope.fileNavigator.refresh();  
        };

      

        var validateSamePath = function(item) {
            var selectedPath = $rootScope.selectedModalPath.join('');
            var selectedItemsPath = item && item.model.filePath;//.path.join('');
            return selectedItemsPath === selectedPath;
        };

        var getQueryParam = function(param) {
            var found = $window.location.search.substr(1).split('&').filter(function(item) {
                return param ===  item.split('=')[0];
            });
            return found[0] && found[0].split('=')[1] || undefined;
        };

        $scope.changeLanguage(getQueryParam('lang'));
        $scope.isWindows = getQueryParam('server') === 'Windows';
        $scope.fileNavigator.refresh();

    }]);
})(angular);
