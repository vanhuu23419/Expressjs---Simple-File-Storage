// Promisify the FileReader 
//
function readDataAsync(blob) {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

// Convert bytes to human readable
function niceBytes(x){
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let l = 0, n = parseInt(x, 10) || 0;
  while(n >= 1024 && ++l){
      n = n/1024;
  }
  return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l]);
}


//////////////////////////////////////////////////////////////////////////////////

function downloadFile() {
  var fileID = w2ui['fileManagerGrid'].getSelection()[0]
  if ( ! fileID) {
    alert('Please select a file to download.')
    return
  }
  var file = w2ui['fileManagerGrid'].get(fileID)
  var anchorElt = document.createElement('a')
  anchorElt.href = `/api/v1/file/download/${file.fileName}/${fileID}`
  anchorElt.click()
}

async function deleteFile() {
  var fileID = w2ui['fileManagerGrid'].getSelection()[0]
  if ( ! fileID) {
    alert('Please select a file to delete.')
    return
  }
  else {
    var proceed = confirm("This file will be delete permantly. Do you want to proceed?")
    if ( ! proceed ) {
      return
    }
  }
  var file = w2ui['fileManagerGrid'].get(fileID)
  await fetch(`/api/v1/file/delete/${file.fileName}/${fileID}`, { method: 'post' })
  // update grid record
  var recIndex = w2ui['fileManagerGrid'].get(fileID, true)
  w2ui['fileManagerGrid'].unselect(recIndex)
  w2ui['fileManagerGrid'].records.splice(recIndex, 1)
  w2ui['fileManagerGrid'].refresh()
  alert('File deleted')
}

function registerFileUploadGrid() {

  $().w2grid({
    name: 'fileUploadGrid',
    show: { toolbar: true, lineNumbers: true,searchAll: false, toolbarReload: false, toolbarSearch: false, selectColumn: true, },
    multiSelect: true,
    toolbar: {
      style: 'height: 44px; padding-top: 2px',
      items: [
        { type: 'html', id: 'addFiles', 
          html: `
            <button id="addFilesBtn" class="btn-0 py-6 px-10 bg-primary txt-white corner-5" onclick="$('#uploadInput').click()"> 
              Add file
              <i class="ri-add-fill fs-16"></i>
            </button>`, 
        },
        { type: 'html', id: 'removeAll', 
          html: `
            <button id="removeSelectedBtn" class="btn-0 py-6 px-10 bg-danger txt-white corner-5" onclick="FileUploader.removeSelected()"> 
              Remove Selected
              <i class="ri-close-fill fs-16"></i>
            </button>`, 
        },
        { type: 'break' },
        { type: 'html', id: 'uploadAll', 
          html: `
            <button id="startUpload" class="btn-0 py-6 px-10 bg-warning txt-white corner-5" onclick="FileUploader.startUpload()" 
              ${(FileUploader.canUpload()? '' : 'disabled="disabled"')}"> 
              Start Upload
              <i class="ri-folder-upload-line fs-16"></i>
            </button>
          `, 
        },
        { type: 'html', id: 'pause', 
          html: `
            <button id="pauseBtn" class="btn-0 py-6 px-10 bg-secondary txt-white corner-5" onclick="FileUploader.pauseUpload()"> 
              Pause
              <i class="ri-pause-circle-fill fs-20"></i>
            </button>
            <button id="continueBtn" class="btn-0 py-6 px-10 bg-secondary txt-white corner-5" onclick="FileUploader.continueUpload()"> 
              Continue
              <i class="ri-play-circle-fill fs-20"></i>
            </button>`, 
        },
        
      ],
    },
    columns: [
      { field: 'fileName', text: 'File Name', editable: false },
      { field: 'progress', text: 'Progress', size: '210px', editable: false,
        render: function(rec) {
          if (rec.status == 'waiting') {
            return `<span class="txt-secondary"> <i>wating for upload</i> </span>`
          }
          if (rec.status == 'completed') {
            return `<span class="txt-primary"> <i> completed </i> </span>`
          }
          return `
            <div class="d-flex align-items-center"> 
              <progress max="100" value="${rec.progress}" style="width: 150px; height: 20px"></progress>
              <span class="ms-10">`+ 
                (
                  (rec.status == 'paused') ? 
                    `<span class="txt-wanring"> <i> paused </i> </span>` : 
                    `- ${rec.progress}%`
                ) 
              +`</span>
            </div>
          `
        } 
      },
    ],
    onRender: function(e) {

      e.onComplete = function() {
        FileUploader.init()
      }
    }
  });
}

async function registerFileManagerGrid() {
  
  // Get files records
  //
  var result = await fetch('/api/v1/file/', {method: 'post'})
  var files = await result.json()
  var gridRecords = []
  files.forEach( f => {
    gridRecords.push({
      recid: f.fileID,
      fileID: f.fileID,
      fileName: f.file_name,
      createdDate: new Date(parseInt(f.created_date)).toDateString(),
      size: niceBytes( f.size ),
      type: f.type.slice(1)
    })
  })

  // Resister Grid with records
  $().w2grid({
    name: 'fileManagerGrid',
    show: { toolbar: true, lineNumbers: true, searchAll: false, toolbarReload: false, toolbarSearch: false, selectColumn: true, },
    multiSelect: false,
    toolbar: {
      style: 'height: 45px;padding-top:4px',
      items: [
        { type: 'html', id: 'toolbarActions', 
          html: `
            <button id="downloadFilesBtn" class="btn-0 py-6 px-10 bg-prime txt-white corner-5" onclick="downloadFile()"> 
              Download
              <i class="ri-file-download-line fs-16"></i>
            </button>

            <button id="deleteFilesBtn" class="btn-0 py-6 px-10 bg-danger txt-white ms-6 corner-5" onclick="deleteFile()"> 
              Move to trash
              <i class="ri-delete-bin-5-line fs-16"></i>
            </button>
          `, 
        },
      ]
    },
    columns: [
      { field: 'fileName', text: 'File Name', editable: false },
      { field: 'createdDate', text: 'Created Date', editable: false, size: '200px' },
      { field: 'size', text: 'Size', editable: false, size: '100px' },
    ],
    onRender: function(e) {
      e.onComplete = async () => {
        w2ui['fileManagerGrid'].records = gridRecords
        w2ui['fileManagerGrid'].refresh()
      }
    }
  });
}

function renderFileUploadGrid() {

  registerFileUploadGrid()
  w2ui['layout2'].html('main', w2ui['fileUploadGrid'])
}

async function renderFileManagerGrid() {

  await registerFileManagerGrid()
  w2ui['layout2'].html('main', w2ui['fileManagerGrid']);
}