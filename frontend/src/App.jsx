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
  }

  async function download(itag) {
    try{
      const res = await axios.post('http://localhost:8800/download', {
        url : url, 
        format : 'mp4',
        itag : itag
      }, {
        responseType : 'blob',
      })

      if (res.data.size === 0) {
        console.error("Empty response data");
        return;
      }

      const videoUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a')
      link.href = videoUrl;
      link.setAttribute('download', 'video.mp4')
      document.body.appendChild(link)
      link.click()

      link.remove(); // Remove link from the document
      window.URL.revokeObjectURL(videoUrl); // Free memory
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
                  <button  onClick={() => download(eachReso.itag)}>{eachReso.quality}</button>
                  <div className='filesize'>{eachReso.fileSize}</div>
                </div>   
              ))
            } 
          </div>
        )
         : null
      }
    </div>
  )
}

export default App
