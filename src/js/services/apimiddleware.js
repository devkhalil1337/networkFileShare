(function(angular) {
    'use strict';
    angular.module('FileManagerApp').service('apiMiddleware', ['$window', 'fileManagerConfig', 'apiHandler', 
        function ($window, fileManagerConfig, ApiHandler) {

        var ApiMiddleware = function() {
            this.apiHandler = new ApiHandler();
        };

        ApiMiddleware.prototype.getPath = function(arrayPath) {
            let isUnixFormat = fileManagerConfig.basePath && fileManagerConfig.basePath.length > 1 && fileManagerConfig.basePath[0] === '/';
            if(arrayPath && arrayPath.length>0){
                return (isUnixFormat? '/': '') + arrayPath.join('/');
            }
            
        };

        ApiMiddleware.prototype.getFileList = function(files) {
            return (files || []).map(function(file) {
                return file && file.model.filePath; //fullPath();
            });
        };

        ApiMiddleware.prototype.getFilePath = function(item) {
            return item && item.model.fullPath();
        };

        ApiMiddleware.prototype.list = function(path, customDeferredHandler) {
            console.log('fileManagerConfig', fileManagerConfig);
            let url = fileManagerConfig.baseUrl+fileManagerConfig.listUrl+fileManagerConfig.queryParams;
            return this.apiHandler.list(url, customDeferredHandler);
        };

        ApiMiddleware.prototype.copy = function(files, path) {
            var items = this.getFileList(files);
            var singleFilename = items.length === 1 ? files[0].tempModel.name : undefined;
            return this.apiHandler.copy(fileManagerConfig.copyUrl, items, this.getPath(path), singleFilename);
        };

        ApiMiddleware.prototype.move = function(files, path) {
            //var items = this.getFileList(files);
            path = this.getPath(path);
            var url = fileManagerConfig.baseUrl+fileManagerConfig.fileUrl+files[0].model.id+fileManagerConfig.moveUrl+path;
            return this.apiHandler.move(url);
        };

        ApiMiddleware.prototype.remove = function(files) {
            let url = fileManagerConfig.baseUrl+fileManagerConfig.removeUrl+files[0].model.id;
            return this.apiHandler.remove(url);
        };

        ApiMiddleware.prototype.upload = function(files, path) {
            if (! $window.FormData) {
                throw new Error('Unsupported browser version');
            } 

            var destination = this.getPath(path);
            var url = fileManagerConfig.baseUrl+fileManagerConfig.uploadUrl+destination;

            return this.apiHandler.upload(url, destination, files);
        };

        ApiMiddleware.prototype.abortUpload = function(files, path) {
            return this.apiHandler.abortUpload();
        };

        ApiMiddleware.prototype.getContent = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.getContent(fileManagerConfig.getContentUrl, itemPath);
        };

        ApiMiddleware.prototype.edit = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.edit(fileManagerConfig.editUrl, itemPath, item.tempModel.content);
        };

        ApiMiddleware.prototype.rename = function(item) {
            var itemPath = this.getFilePath(item);
            var newPath = item.tempModel.fullPath();

            return this.apiHandler.rename(fileManagerConfig.renameUrl, itemPath, newPath);
        };

        ApiMiddleware.prototype.getUrl = function(item) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.getUrl(fileManagerConfig.downloadFileUrl, itemPath);
        };

        ApiMiddleware.prototype.editFile = function(item) {
            let apiUrl =  `${fileManagerConfig.baseUrl + fileManagerConfig.editFileUrl}`;
            return this.apiHandler.editFile(apiUrl, item.model);
        };

        ApiMiddleware.prototype.download = function(item) {
            //TODO: add spinner to indicate file is downloading
            var itemObj = item[0]
            var apiUrl = `${fileManagerConfig.baseUrl  + fileManagerConfig.downloadUrl + itemObj.tempModel.id}/downloadFile`;
            var toFilename = itemObj.model.fileName;
            if (itemObj.isFolder()) {
                return;
            }
            return this.apiHandler.download(apiUrl,toFilename);
        };

        ApiMiddleware.prototype.moveFileOrDirectory = function(itemFrom, itemTo) {
            var _itemToPath = this.getFilePath(itemTo);
            var itemObj = itemFrom[0];
            var apiUrl = `${fileManagerConfig.baseUrl  + fileManagerConfig.fileUrl + itemObj.tempModel.id + fileManagerConfig.moveUrl + _itemToPath}`;
            return this.apiHandler.moveFile(apiUrl);
        };

        ApiMiddleware.prototype.recoverFile = function(itemFrom) {
            var itemObj = itemFrom[0];
            var apiUrl = `${fileManagerConfig.baseUrl  + fileManagerConfig.fileUrl + itemObj.tempModel.id}/recoverFile`;
            return this.apiHandler.recoverFile(apiUrl);
        };

        ApiMiddleware.prototype.downloadMultiple = function(files, forceNewWindow) {
            var items = this.getFileList(files);
            var timestamp = new Date().getTime().toString().substr(8, 13);
            var toFilename = timestamp + '-' + fileManagerConfig.multipleDownloadFileName;
            
            return this.apiHandler.downloadMultiple(
                fileManagerConfig.downloadMultipleUrl, 
                items, 
                toFilename, 
                fileManagerConfig.downloadFilesByAjax,
                forceNewWindow
            );
        };

        ApiMiddleware.prototype.compress = function(files, compressedFilename, path) {
            var items = this.getFileList(files);
            return this.apiHandler.compress(fileManagerConfig.compressUrl, items, compressedFilename, this.getPath(path));
        };

        ApiMiddleware.prototype.extract = function(item, folderName, path) {
            var itemPath = this.getFilePath(item);
            return this.apiHandler.extract(fileManagerConfig.extractUrl, itemPath, folderName, this.getPath(path));
        };

        ApiMiddleware.prototype.changePermissions = function(files, dataItem) {
            var items = this.getFileList(files);
            var code = dataItem.tempModel.perms.toCode();
            var octal = dataItem.tempModel.perms.toOctal();
            var recursive = !!dataItem.tempModel.recursive;

            return this.apiHandler.changePermissions(fileManagerConfig.permissionsUrl, items, code, octal, recursive);
        };

        ApiMiddleware.prototype.createFolder = function(item) {
            var path = item.tempModel.fullPath();
            let url = fileManagerConfig.baseUrl + fileManagerConfig.createFolderUrl + path;
            return this.apiHandler.createFolder(url, path);
        };

        return ApiMiddleware;

    }]);
})(angular);