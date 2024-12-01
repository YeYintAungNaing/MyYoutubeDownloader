import { useState } from 'react'
import './App.scss'
import axios from "axios"


function App() {

  const [url, setUrl]  = useState("");
  const [details, setDetails] = useState(null);
  const [message, setMessage] = useState('Insert the link and download the video with your desired resolution')

  //console.log(url)


  async function getDetails() {

    try{
      const res = await axios.post('http://localhost:8800/preview', {
        url : url,  
      })
      //console.log(res.data)
      setDetails(res.data)

    }
    catch(e) {
      if (e.response) {
        //console.log(e.response.message)
        setMessage(e.response.data)
      }
      else{
        //console.log("from frontend", e)
        setMessage('Enexpected error occurs')
      } 
    }   
  }

  function clearContent() {
    setUrl('')
    setDetails(null)
    setMessage('Insert the link and download the video with your desired resolution')
  }

  async function downloadMp4(videoItag, audioItag) {

    let userInput = null

    while (true) {
      userInput = prompt("Enter your file name");
  
      if (userInput !== null && userInput?.length > 0 && userInput?.length < 16  ) {
         
          break; 
      }
  
      alert("Invalid input. Please try again.");
    }

    //console.log(userInput)

   const sanitizedFilename = (fileName) => fileName.replace(/[<>:"/.\\|?*]/g, '');

    let fileName = sanitizedFilename(userInput)


    try{
      setMessage('Downloading')
      const res = await axios.post('http://localhost:8800/download/video', {
        url : url, 
        videoItag : videoItag,
        audioItag : audioItag,
        fileName : fileName
      }, {
        responseType : 'blob',
      })

      if (res.data.size === 0) {
        console.error("Empty response data");
        setMessage('failed')
        return;
      }

      const videoUrl = window.URL.createObjectURL(new Blob([res.data]));   //  creates a temporary, unique URL for the Blob
      const link = document.createElement('a')
      link.href = videoUrl;  // Assigns the temporary file URL (videoUrl) as the href attribute of the anchor (<a>) element.
      link.setAttribute('download', `${fileName}.mp4`)  //tells the browser to download the file wiith a specifc file name
      document.body.appendChild(link)  //Appends the anchor element (link) to the document.body to ensure the link is part of the DOM
      link.click()  //Simulates a click on the anchor element to triggers the download of the file
      link.remove();   // // Remove link from the document
      window.URL.revokeObjectURL(videoUrl); // Releases the memory associated with the temporary videoUrl
      setMessage('Completed')
    }
    catch(e) {
      console.log(e)
      setMessage('Failed')
    }
  }

  async function downloadMp3() {

    let userInput = null

    while (true) {
      userInput = prompt("Enter your file name");
  
      if (userInput !== null && userInput?.length > 0 && userInput?.length < 16  ) { 
          break; 
      }
  
      alert("Invalid input. Please try again.");
    }

    const sanitizedFilename = (fileName) => fileName.replace(/[<>:"/.\\|?*]/g, '');

    let fileName = sanitizedFilename(userInput)

    try {
      setMessage('Downloading as mp3 could take a while. Pls wait...')
      const res = await axios.post('http://localhost:8800/download/audio', {
        url,
        fileName
      }, {
          responseType : 'blob'
      })

      if (res.data.size === 0) {
        console.error("Empty response data");
        return;
      }

      const audioUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = audioUrl;
      link.setAttribute('download', `${fileName}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(audioUrl);
      setMessage('Completed')
    }
    catch(e) {
      console.log(e)
      setMessage('Failed')
    }
  }
  
  return (
    <div className='app'>
      <div className='message'>{message}</div>
      <input 
        placeholder='Insert link here' 
        value={url} 
        onChange={(e) => setUrl(e.target.value) }>
      </input>
      <div className='controls'>
        <button className='getDetails'  onClick={getDetails}>Get details</button>
        <button className='clear' onClick={clearContent}>Clear</button>
      </div>
      
      {
        details? (
          <div className='videoInfo'>
          <div className='title'>{details.name}</div>
            {
              details.resolutions.map((eachReso, i) => (
                <div className='details' key={i}>
                  <button  onClick={() => downloadMp4(eachReso.videoItag, eachReso.audioItag)}>{eachReso.quality}</button>
                  <div className='filesize'>{eachReso.fileSize}</div>
                </div>   
              )) 
            }
            <button className='mp3-download' onClick={() => downloadMp3()}>Download as mp3</button>
          </div>
        )
         : null
      }
    </div>
  )
}

export default App
