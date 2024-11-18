import express from "express"
import cors from 'cors'
import ytdl from "@distube/ytdl-core"
import Ffmpeg from "fluent-ffmpeg"
import rateLimit from "express-rate-limit"
import ffmpeg from '@ffmpeg-installer/ffmpeg';




const app = express()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max : 50,
  message : 'Too many requests, please try again later!',
  standardHeaders : true,
  legacyHeaders : false,
})

app.use(express.json())

app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}))
    
app.use(limiter)

app.post('/download/video',  (req, res) => {
    const url = req.body.url
    const itag = req.body.itag
    let fileName = req.body.fileName

    if (!ytdl.validateURL(url)) {
      return res.status(400).json( 'Invalid YouTube URL' )
    }
  
    try { 
        const videoStream = ytdl(url, { filter: (format) => format.itag === itag });
        res.setHeader('Content-Disposition', `'attachment; filename=${fileName}.mp4'`);
        res.setHeader('Content-Type', 'video/mp4'); 
        //console.log('here');
        videoStream.on('error', (error) => {
          console.error('Stream Error:', error);
          res.status(500).send('Error streaming video');
        });
        videoStream.pipe(res);
    }
    catch (e) {
      console.error('Error downloading video:', e);
      res.status(500).json('Failed to download video');
    }  
})


app.post('/download/audio', (req, res) => {
  const url = req.body.url
  const fileName = req.body.fileName

  if (!ytdl.validateURL(url)) {
    return res.status(400).json( 'Invalid YouTube URL' )
  }

  try{
    //const videoStream = ytdl(url, { quality: 'highest' });
    const videoStream = ytdl(url, { filter: format => format.audioCodec });
    res.setHeader('Content-Disposition', `'attachment; filename=${fileName}.mp3'`);
    res.setHeader('Content-Type', 'audio/mpeg');

    Ffmpeg.setFfmpegPath(ffmpeg.path);

    Ffmpeg(videoStream)
            .audioCodec('libmp3lame')
            .format('mp3')
            .on('error', (error) => {
                console.error('FFmpeg Error:', error);
                res.status(500).send('Error converting video to MP3');
            })
            .pipe(res);
  }
  catch(e){
    console.error('Error downloading audio:', e);
    res.status(500).json('Failed to download audio');
  }
})


app.post('/preview', async (req, res) => {
    const url = req.body.url;
    //console.log(req.body)

    if (!ytdl.validateURL(url)) {
        res.status(400).json( 'Invalid YouTube URL' )
        return
    }

    try{
        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        // const availableFormats = info.formats
        //     .filter(format => format.hasVideo) 
        //     .map(format => ({
        //         quality: format.qualityLabel,
        //         fileSize: format.contentLength
        //         ? (parseInt(format.contentLength, 10) / (1024 * 1024)).toFixed(2) + ' MB'
        //         : 'Unknown',
        //     }));

        const uniqueResolutions = {};

        info.formats.forEach(format => {
            const quality = format.qualityLabel || null;
            //console.log(format)
            
            const size = format.contentLength ? parseInt(format.contentLength, 10) : null;
          
            // Proceed only if there is a quality label and file size
            if (quality && size) {
              // Check if this resolution exists or if the new size is smaller
              if (!uniqueResolutions[quality] || uniqueResolutions[quality].fileSize > size) {
                uniqueResolutions[quality] = {
                  quality: quality,
                  itag: format.itag,
                  fileSize: (size / (1024 * 1024)).toFixed(2) + ' MB'
                };
              }
            }
          });
          
          // Convert back to an array for easier handling
          const simplifiedResolutions = Object.values(uniqueResolutions);
          //console.log(simplifiedResolutions)
          res.json({ name : videoDetails.title, resolutions : simplifiedResolutions})
    }
    catch(e) {
        res.status(500).json( 'Failed to retrieve video information');
    }
})


app.listen(8800, () => {
    console.log('connected to backend')
})