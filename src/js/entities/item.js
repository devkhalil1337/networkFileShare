(function(angular) {
    'use strict';
    angular.module('FileManagerApp').factory('item', ['fileManagerConfig', 'chmod', function(fileManagerConfig, Chmod) {

        var Item = function(model, path) {
            var rawModel = {
                // name: model && model.name || '',
                // subFolderLink: model.subFolderLink,
                // path: path || [],
                // type: model && model.type || 'file',
                // size: model && parseInt(model.size || 0),
                // date: parseMySQLDate(model && model.date),
                // perms: new Chmod(model && model.rights),
                // content: model && model.content || '',
                // recursive: false,
            
                id: model && model.id || null,
                isFile: model && model.isFile || false,
                fileName: model && model.fileName || '',
                parentDirectoryName: model && model.parentDirectoryName || null,
                parentDirectoryPath: model && model.parentDirectoryPath || null,
                filePath: model && model.filePath || path ||null,
                fileRecoveryPath: model && model.fileRecoveryPath || null,
                fileSize: model && model.fileSize || null,
                fileType: model && model.fileType || 'file',
                extension: model && model.extension || null,
                attachmentNumber: model && model.attachmentNumber || null,
                description: model && model.description || null,
                numberOfPages: model && model.numberOfPages || null,
                modifiedDate: model && model.modifiedDate || null,
                accessDateTime: model && model.accessDateTime || null,
                fileUploadDate: model && model.fileUploadDate || null,
                fileReceivedDate: model && model.fileReceivedDate || null,
                subFolderLink: model && model.subFolderLink || null,
                thumbnail:  model && model.thumbnail || null,
                fullPath: function(currentFilePath) {
                    let path = '';
                    let isUnixFormat = fileManagerConfig.basePath && fileManagerConfig.basePath.length > 1 && fileManagerConfig.basePath[0] === '/';
                    if(this.filePath){
                        path = (fileManagerConfig.basePath || ''); //replace(/^\//, '')
                        currentFilePath = path.trim() ? path.split('/') : [];
                    }
                    path = currentFilePath.filter(Boolean);
                    return (isUnixFormat? '/': '') + (path.join('/') + '/' + this.fileName).replace(/\/\//, '/');
                }
            };

            this.error = '';
            this.processing = false;

            this.model = angular.copy(rawModel);
            this.tempModel = angular.copy(rawModel);

            function parseMySQLDate(mysqlDate) {
                var d = (mysqlDate || '').toString().split(/[- :]/);
                return new Date(d[0], d[1] - 1, d[2], d[3], d[4], d[5]);
            }
        };

        Item.prototype.update = function() {
            angular.extend(this.model, angular.copy(this.tempModel));
        };

        Item.prototype.revert = function() {
            angular.extend(this.tempModel, angular.copy(this.model));
            this.error = '';
        };

        Item.prototype.isFolder = function() {
            return this.model.isFile === false;
        };

        Item.prototype.isEditable = function() {
            return !this.isFolder() && fileManagerConfig.isEditableFilePattern.test(this.model.name);
        };

        Item.prototype.isImage = function() {
            return fileManagerConfig.isImageFilePattern.test(this.model.name);
        };

        Item.prototype.isCompressible = function() {
            return this.isFolder();
        };

        Item.prototype.isExtractable = function() {
            return !this.isFolder() && fileManagerConfig.isExtractableFilePattern.test(this.model.name);
        };

        Item.prototype.isSelectable = function() {
            return (this.isFolder() && fileManagerConfig.allowedActions.pickFolders) || (!this.isFolder() && fileManagerConfig.allowedActions.pickFiles);
        };

        return Item;
    }]);
})(angular);