import * as Magick from '/magick/magickApi.js';

//zip
var blobArray = [];

async function uploadFile(zipFile, i) {

    let imgNames = "";
    let cid = i;
    let imgFiles = await getZipFilesContent(zipFile);
    let outputNameArray;
    let outputName;
        for (const [key, value] of Object.entries(imgFiles)) {
            imgNames += " " + value.name;
            outputName = value.name;
          }
          outputNameArray = outputName.split("_");
          outputName = outputNameArray.slice(2, outputNameArray.length - 2).join("_") +".gif";

          var cmd = "convert -quiet -dispose Background"; 
          cmd += imgNames;
          cmd+= " -define dither:diffusion-amount=50% -dither FloydSteinberg  -trim -layers TrimBounds +remap -channel A ";
          cmd+= outputName;
      
      
          var text = cmd;
          var files = [];
          var command = text.trim().split(/\s+/).filter(seg=>{
              if(seg == '\\')return false
              if(seg.match(/\.(jpg|png|webp|jpeg|gif)$/))files.push(seg);
              return true;
          });
          var back = files.pop();
          console.log(cmd,outputName);
          var p = document.createElement('p');
          var node = document.createTextNode("Loading " + outputName + "...");
          p.appendChild(node);

          document.querySelector('#state').appendChild(p);
          let processedFiles = await Magick.Call(imgFiles, command); 

          document.querySelectorAll('#state p')[cid].textContent = outputName + " has been generated.";
          let firstOutputImage = processedFiles[0];
          var img = document.createElement('img');
          img.src = URL.createObjectURL(firstOutputImage['blob']);
          Array.from(document.querySelectorAll('.output'))[0].appendChild(img);
          var blobElem = ({name: outputName, url: img.src});
          return blobElem;
          //   document.querySelector('#state').textContent = `使用${files.join(',')},生成${back}`;
       //   imWorker.postMessage({type:'cmd',data:{command:command,files:imgFiles,back:back,cid:cid}});

}

 async function getZipFilesContent (data) {
    const zipContent = []
    const promises = []
    const zip = (await JSZip.loadAsync(data))
    zip.forEach(async (relativePath, file) => {
      const promise = file.async('uint8array')
      promises.push(promise)
      zipContent.push({
        name: relativePath,
        content: await promise
      })
    })

    await Promise.all(promises)
    return zipContent.sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}))
  }
// ************************ Drag and drop ***************** //
let dropArea = document.getElementById("drop-area")
let uploadArea = document.getElementById("fileElem")

uploadArea.addEventListener('change', handleUpload, false);

// Prevent default drag behaviors
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false)   
  document.body.addEventListener(eventName, preventDefaults, false)
})

// Highlight drop area when item is dragged over it
;['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false)
})

;['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false)
})

// Handle dropped files
dropArea.addEventListener('drop', handleDrop, false)

function preventDefaults (e) {
  e.preventDefault()
  e.stopPropagation()
}

function highlight(e) {
  dropArea.classList.add('highlight')
}

function unhighlight(e) {
  dropArea.classList.remove('active')
}

function handleUpload() {
    var files = this.files;
    handleFiles(files)
  }


function handleDrop(e) {
  var dt = e.dataTransfer
  var files = dt.files

  handleFiles(files)
}

let uploadProgress = []
let progressBar = document.getElementById('progress-bar')

function initializeProgress(numFiles) {
  progressBar.value = 0
  uploadProgress = []

  for(let i = numFiles; i > 0; i--) {
    uploadProgress.push(0)
  }
}

function updateProgress(fileNumber, percent) {
  uploadProgress[fileNumber] = percent
  let total = uploadProgress.reduce((tot, curr) => tot + curr, 0) / uploadProgress.length
  console.debug('update', fileNumber, percent, total)
  progressBar.value = total
}

async function handleFiles(files) {
  let downloadButton = document.getElementById('downloadZip');

  if(blobArray.length > 0)
  {
    var el = document.getElementsByClassName('output')[0];
    while ( el.firstChild ) el.removeChild( el.firstChild );

    var state = document.getElementById('state');
    while ( state.firstChild ) state.removeChild( state.firstChild );

    blobArray.map(file=>{
      URL.revokeObjectURL(file.url);
  });
  downloadButton.disabled = true;
  downloadButton.classList.remove("enabled");
  downloadButton.classList.add("disabled");
  blobArray.length = 0;
  }


  if(files.length > 5)
  {
    files = files.slice(0, 4);
  }

  files = [...files]
  initializeProgress(files.length)
  // files.forEach(uploadFile)
  var i = 0;
  for (const file of files) {
    const blob = await uploadFile(file, i);
    i++;
    blobArray.push(blob);
  }
  
  downloadButton.disabled = false;
  downloadButton.classList.remove("disabled");
  downloadButton.classList.add("enabled");
  downloadButton.addEventListener("click", downloadImgZip);
  //files.forEach(previewFile)
}

function previewFile(file) {
  let reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onloadend = function() {
    let img = document.createElement('img')
    img.src = reader.result
    document.getElementById('gallery').appendChild(img)
  }
}

/*function downloadImgZip()
{
  var zip = new JSZip();

    blobArray.map(file=>{
      zip.file(file.name, file.url);          
      return true
      }).then(_=>{
    zip.generateAsync({type:"blob"}).then(function (blob) { // 1) generate the zip file
      const currentDate = new Date().getTime();
      const fileName = `ss_gifSprites-${currentDate}.zip`;
      saveAs(blob, fileName); 
      e.preventDefault();                       // 2) trigger the download
  }, function (err) {
      console.log(err);
  });

      })
}*/

var Promise = window.Promise;
if (!Promise) {
    Promise = JSZip.external.Promise;
}

/**
 * Fetch the content and return the associated promise.
 * @param {String} url the url of the content to fetch.
 * @return {Promise} the promise containing the data.
 */
function urlToPromise(url) {
    return new Promise(function(resolve, reject) {
        JSZipUtils.getBinaryContent(url, function (err, data) {
            if(err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}


async function downloadImgZip() {

  var zip = new JSZip();

  // find every checked item
  blobArray.map(file=>{
      zip.file(file.name, urlToPromise(file.url), {binary:true});
  });

  // when everything has been downloaded, we can trigger the dl
  zip.generateAsync({type:"blob"}, function updateCallback(metadata) {
      var msg = "progression : " + metadata.percent.toFixed(2) + " %";
  })
  .then(function callback(blob) {
    const currentDate = new Date().getTime();
    const fileName = `ss_gifSprites-${currentDate}.zip`;
      // see FileSaver.js
      saveAs(blob, fileName);
  })
}
