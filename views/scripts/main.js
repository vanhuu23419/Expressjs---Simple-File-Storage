

///////////////////  API SCRIPTS  /////////////////////////////////////////////////////////////////////


// Promisify the FileReader 
//
function readDataAsync(blob) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

// After Init Session
// Upload a chunk of base64 encoded data to server
async function uploadChunk(tempID, file, start, chunkSize) {
  
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
}

// Handle upload file to server
//
async function uploadFile(file, sessionID, maxChunkSize = 1000000) {
  var fetchResult 
    = await fetch('/api/v1/file/upload/start/'+sessionID+'/'+file.name, {method: 'POST'}) 
  var {tempID, status, message } = await fetchResult.json()
  // Prepare & Start Upload
  if (status == 'failed') {
    debugger
    return { error: message }
  }
  var chunkSize = maxChunkSize, startIndex = 0;
  while (startIndex < file.size - 1) {
    var {error} = await uploadChunk(tempID, file, startIndex, chunkSize)
    if (error) {
      debugger
      return {error}
    }
    startIndex += chunkSize
  }
  // Request to finish upload this file
  await fetch(`/api/v1/file/upload/finish/${sessionID}/${tempID}`, { method: 'POST' })
  return {}
}

async function uploadAllFiles() {
  
  // Request: Registering a new session for uploading these files
  var data = await fetch('/api/v1/file/upload/start', { method: 'POST' })
  var { sessionID, maxChunkSize, status, message } = await data.json()
  if ( status == 'failed') {
    alert(message??'Something went wrong. Abort uploading');
    return;
  }
  // Prepare & Upload All Files
  var files = document.getElementById('uploadInput').files;
  if(files.length == 0) {
    return
  }
  for (let i = 0; i < files.length; ++i) {
    var {error} = await uploadFile( files[i], sessionID, maxChunkSize )
    if (error) {
      debugger
      // handle error
    }
  }
  // All file's data has been upload
  // make request to finish & clear this session
  await fetch(`/api/v1/file/upload/close/${sessionID}`, { method: 'POST' })
  alert('Thành công')
}

