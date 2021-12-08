
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const FileUploader = {
  grid: 'fileUploadGrid',
  files: [],
  uploadStatus: { status: 'waiting', index: 0, chunkIndex: 0 }, 
  canUpload: function() {
    return this.files.length > 0
  },
  onAddFile: function(files) {
    if (files.length == 0) {
      return
    }
    for(let i = 0; i<files.length; ++i){
      // Because the FileUploader.files will change
      // This File ID shared between FileUploader.Files and FileUploader Grid
      // and later will be used to search & update the Grid
      files[i].fileID = 'fid-'+ Date.now() 
      this.addFile( files[i] )     
    }
    // Clear Input Value, so we could add new files
    $('#uploadInput').val(null)
    // Update Toolbar View
    $('#startUpload').prop('disabled', false)
  },
  addFile: function(file) {
    var that = this
    that.files.push(file)
    w2ui[that.grid].add({ 
      fileID: file.fileID,
      recid: file.fileID, fileName: file.name, progress: 0, status: 'waiting' 
    })
  },
  uploadChunk: async function (tempID, file, start, chunkSize) {
    var that = this
    // Paused
    if (that.uploadStatus.status == 'paused' || that.uploadStatus.status == 'removed') {
      return
    }
    var base64Data = await readDataAsync(file.slice(start, start + chunkSize))
    // Replace characters which ommitted when sending XHR
    if (base64Data) {
      base64Data = base64Data.substr(base64Data.indexOf(',') + 1)
      base64Data = base64Data.replace(/&/g, '[AMP]')
      base64Data = base64Data.replace(/\+/g, '[PLUS]')
    }
    // Upload chunk
    var result = await fetch('/api/v1/file/upload/' + tempID, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: "chunk=" + base64Data
    });

    var { status, message } = await result.json()
    if (status == 'failed') {
      return { error: message }
    }
    return { }
  },
  uploadFile: async function (index) {
    var that = this
    if (['paused', 'removed'].includes(that.uploadStatus.status)) {
      return
    }
    // Request new TEMPID if not started yet
    if ( that.uploadStatus.status == 'waiting' ) {
      var fetchResult 
      = await fetch(`/api/v1/file/upload/start/${that.sessionID}/${that.files[index].name}/${that.files[index].size}`, {method: 'POST'}) 
      var {tempID, status, message } = await fetchResult.json()
      // update FileUploader status
      that.uploadStatus = { fileID: that.files[index].fileID, status: 'uploading', tempID, chunkIndex: 0 }
      // upload Progress bar
      w2ui[that.grid].get(that.files[index].fileID).status = 'uploading'
      w2ui[that.grid].get(that.files[index].fileID).progress = 0
      w2ui[that.grid].refresh()
    }
    // Uploading
    var { chunkIndex, tempID } = that.uploadStatus;
    while (true) {
      // Paused or Removed
      if (['paused', 'removed'].includes(that.uploadStatus.status)) {
        return
      }
      // check loop condition ( it change in runtime due to user interaction )
      if (! that.files[index] || ! (chunkIndex < that.files[index].size - 1)) {
        break
      }
      // upload Progress bar
      w2ui[that.grid].get(that.files[index].fileID).progress = Math.round((chunkIndex/that.files[index].size)*100)
      w2ui[that.grid].refresh()
      // upload chunk
      await that.uploadChunk(tempID, that.files[index], chunkIndex, that.maxChunkSize)
      // Paused or Removed
      if (['paused', 'removed'].includes(that.uploadStatus.status)) {
        return
      }
      //
      chunkIndex += that.maxChunkSize
      that.uploadStatus.chunkIndex = chunkIndex
      console.log('uploaded chunk...')
      await sleep(1000)
    }
    // Request to finish upload this file
    await fetch(`/api/v1/file/upload/finish/${that.sessionID}/${tempID}`, { method: 'POST' })
    // upload Progress bar
    w2ui[that.grid].get(that.files[index].fileID).status = 'completed'
    w2ui[that.grid].refresh()
    //
    return {}
  },
  uploadAllFiles: async function() {
    var that = this
    // Uploading
    var uploadIndex = that.files.findIndex( p => p.fileID == that.uploadStatus.fileID )
    uploadIndex = (uploadIndex == -1) ? 0 : uploadIndex
    for( let i = uploadIndex; i < that.files.length; ++i) {
      console.log(`Uploading: ${that.files[uploadIndex].name}`)
      // upload file
      await that.uploadFile( i )
      //
      if (that.uploadStatus.status == 'paused') {
        return
      }
      if ( that.uploadStatus.status == 'removed') {
        that.uploadStatus = { status: 'waiting' }
        return
      }
      // Prepare for next file
      that.uploadStatus = { status: 'waiting' }
    }
    // All file's data has been upload
    // make request to finish & clear this session
    await fetch(`/api/v1/file/upload/close/${that.sessionID}`, { method: 'POST' })
    alert('File sucessfully uploaded')
    that.files = []
    that.sessionID = null
    // Update Toolbar View
    w2ui[that.grid].toolbar.hide('pause')
    w2ui[that.grid].toolbar.show('uploadAll')
    $('#startUpload').attr('disabled', 'disabled')
  },
  startUpload: async function() {
    var that = this
    // Request: Registering a new session for uploading these files
    var data = await fetch('/api/v1/file/upload/start', { method: 'POST' })
    var { sessionID, maxChunkSize, status, message } = await data.json()
    if ( status == 'failed') {
      alert(message??'Something went wrong. Please try again');
      return;
    }
    // Change Toolbar View
    w2ui[that.grid].toolbar.show('pause')
    w2ui[that.grid].toolbar.hide('uploadAll')
    // Start Upload
    that.sessionID = sessionID
    that.maxChunkSize = maxChunkSize
    that.uploadAllFiles()
  },
  pauseUpload: function() {
    if ( this.uploadStatus.status != 'uploading'){
      return
    }
    // Change Upload Status
    this.uploadStatus.status = 'paused'
    // Update Toolbar View
    $(`.w2ui-grid[name="${this.grid}"]`).addClass('paused')
    console.log('paused')
    // upload Progress bar
    w2ui[this.grid].get(this.uploadStatus.fileID).status = 'paused'
    w2ui[this.grid].refresh()
    //
  },
  continueUpload: async function() {
    if ( this.uploadStatus.status != 'paused'){
      return
    }
    // Change Upload Status
    this.uploadStatus.status = 'uploading'
    // Update Toolbar View
    $(`.w2ui-grid[name="${this.grid}"]`).removeClass('paused')
    console.log('uploading')
    // upload Progress bar
    w2ui[this.grid].get(this.uploadStatus.fileID).status = 'uploading'
    w2ui[this.grid].refresh()
    //
    // Continue Upload
    this.uploadAllFiles()
  },
  removeSelected: async function() {
    var that = this
    var selectedFIDs = w2ui[that.grid].getSelection()
    if (selectedFIDs.length == 0) {
      alert('Please select the items that you want to remove!')
      return
    }
    var proceed = confirm("Are you sure you want to proceed?");
    if (!proceed) {
      return
    } 
    selectedFIDs.forEach( async (FID) => {
      if (that.uploadStatus.fileID == FID) {
        if (['uploading', 'paused'].includes(that.uploadStatus.status)) {
          await fetch(`/api/v1/file/upload/cancel/${that.sessionID}/${that.uploadStatus.tempID}`, {method:'post'})
          that.uploadStatus.status = 'removed'
          // Update Toolbar View
          $('#'+this.grid).removeClass('paused')
          w2ui[that.grid].toolbar.hide('pause')
          w2ui[that.grid].toolbar.show('uploadAll')
        }
      }

      // remove from files
      var indexOf = that.files.findIndex(p => p.fileID == FID)
      if (indexOf != -1){
        that.files.splice(indexOf,1)
      }
      // update grid
      var recIndex = w2ui[that.grid].get(FID, true)
      w2ui[that.grid].records.splice(recIndex, 1)
      w2ui[that.grid].unselect(recIndex)
      w2ui[that.grid].refresh()
    })
  },
  init: function() {
    var that = this
    // Add files event
    $('#uploadInput').on('change', (e) => that.onAddFile(e.target.files))
    // Hide toolbar action
    w2ui[that.grid].toolbar.hide('pause')
  },
}
