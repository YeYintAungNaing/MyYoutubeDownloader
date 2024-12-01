import express from "express"
import cors from 'cors'
import ytdl from "@distube/ytdl-core"
import Ffmpeg from "fluent-ffmpeg"
import rateLimit from "express-rate-limit"
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';

import { fileURLToPath } from 'url';
import path from 'path';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);




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

// app.post('/download/video',  (req, res) => {
//     const url = req.body.url
//     const videoItag = req.body.videoItag
//     const audioItag = req.body.audioItag

//     let fileName = req.body.fileName

//     if (!ytdl.validateURL(url)) {
//       return res.status(400).json( 'Invalid YouTube URL' )
//     }
  
//     try { 
//         const videoStream = ytdl(url, { filter: (format) => format.itag === videoItag });
//         const audioStream = ytdl(url, { filter: (format) => format.itag === audioItag });
//         //const videoStream = ytdl(url, { quality: 'highest' });
//         res.setHeader('Content-Disposition', `'attachment; filename=${fileName}.mp4'`);
//         res.setHeader('Content-Type', 'video/mp4'); 
//         //console.log('here');
//         // videoStream.on('error', (error) => {
//         //   console.error('Stream Error:', error);
//         //   res.status(500).send('Error streaming video');
//         // });
//         // videoStream.pipe(res);
//         ffmpeg()
//         .input(videoStream)
//         .input(audioStream)
//         .videoCodec('copy')
//         .audioCodec('aac')
//         .format('mp4')
//         .on('error', (err) => {
//             console.error(err);
//             res.status(500).send('Error processing the video');
//         })
//         .pipe(res, { end: true });

//     }
//     catch (e) {
//       console.error('Error downloading video:', e);
//       res.status(500).json('Failed to download video');
//     }  
// })


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


        // const uniqueResolutions = {};

        // info.formats.forEach(format => {
        //     const quality = format.qualityLabel || null;
        //     //console.log(format)
            
        //     const size = format.contentLength ? parseInt(format.contentLength, 10) : null;
        //     //console.log(format.hasAudio, quality)
          
        //     // Proceed only if there is a quality label and file size
        //     if ( quality && size ) {
        //       // Check if this resolution exists or if the new size is smaller
        //       if (!uniqueResolutions[quality] || uniqueResolutions[quality].fileSize > size) {
        //         uniqueResolutions[quality] = {
        //           quality: quality,
        //           itag: format.itag,
        //           fileSize: (size / (1024 * 1024)).toFixed(2) + ' MB'
        //         };
        //       }
        //     }
        //   });
          
        //   // Convert back to an array for easier handling
        //   const simplifiedResolutions = Object.values(uniqueResolutions);
        //   //console.log(simplifiedResolutions)
        //   res.json({ name : videoDetails.title, resolutions : simplifiedResolutions})

        const videoFormats = [];
        const audioFormats = [];
        
        // Separate video-only and audio-only formats
        info.formats.forEach(format => {
            const size = format.contentLength ? parseInt(format.contentLength, 10) : null;
        
            if (format.hasVideo && !format.hasAudio && format.qualityLabel && size) {
                videoFormats.push({
                    quality: format.qualityLabel,
                    itag: format.itag,
                    fileSize: (size / (1024 * 1024)).toFixed(2) + ' MB',
                });
            }
        
            if (format.hasAudio && !format.hasVideo && size) {
                audioFormats.push({
                    itag: format.itag,
                    fileSize: (size / (1024 * 1024)).toFixed(2) + ' MB',
                });
            }
        });
        
        // Select the best audio format (smallest size)
        const bestAudio = audioFormats.reduce((prev, current) => {
            return prev.fileSize < current.fileSize ? prev : current;
        }, audioFormats[0]);
        
        
        // A map to keep track of unique qualities
        const uniqueQualities = {};
        
        videoFormats.forEach(video => {
            // Only consider the best video stream for each resolution (quality)
            if (!uniqueQualities[video.quality] || parseFloat(video.fileSize) > parseFloat(uniqueQualities[video.quality].videoSize)) {
                uniqueQualities[video.quality] = {
                    quality: video.quality,
                    videoItag: video.itag,
                    audioItag: bestAudio.itag,
                    fileSize: Math.trunc((parseFloat(video.fileSize) + parseFloat(bestAudio.fileSize)) + 3) + ' MB',
                };
               
            }
        });
        
        // Convert the object to an array to send back to the client
        const filteredFormats = Object.values(uniqueQualities);
        //console.log(filteredFormats)
        
        res.json({ name: videoDetails.title, resolutions: filteredFormats });
 
    }
    catch(e) {
        res.status(500).json( 'Failed to retrieve video information');
    }
})

app.post('/download/video', async (req, res) => {
    const { url, videoItag, audioItag, fileName } = req.body;

    if (!ytdl.validateURL(url)) {
        return res.status(400).json('Invalid YouTube URL');
    }


    const videoPath = path.resolve(__dirname, 'temp_video.mp4');
    const audioPath = path.resolve(__dirname, 'temp_audio.mp4');
    const outputPath = path.resolve(__dirname, `${fileName || 'video'}.mp4`);
    const outputFileName = `${fileName || 'video'}.mp4`;
    

    try {
        // Download video stream
        await new Promise((resolve, reject) => {
            ytdl(url, { filter: (format) => format.itag === videoItag })
                .pipe(fs.createWriteStream(videoPath))
                .on('finish', resolve)
                .on('error', reject);
        });

        // Download audio stream
        await new Promise((resolve, reject) => {
            ytdl(url, { filter: (format) => format.itag === audioItag })
                .pipe(fs.createWriteStream(audioPath))
                .on('finish', resolve)
                .on('error', reject);
        });

        // Merge video and audio with FFmpeg
        Ffmpeg.setFfmpegPath(ffmpeg.path);
        await new Promise((resolve, reject) => {
            Ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .videoCodec('copy') // Copy video codec (no re-encoding)
                .audioCodec('aac') // Encode audio as AAC
                .format('mp4') // Output format
                .save(outputPath) // Save the merged file
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                })
                .on('end', resolve);
        });

        // Send the merged file to the client
        res.download(outputPath, outputFileName, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Failed to send the file');
            }

            // Clean up temporary files
            fs.unlink(videoPath, () => {});
            fs.unlink(audioPath, () => {});
            fs.unlink(outputPath, () => {});
        });
        
    } catch (error) {
        console.error('Error processing video:', error);
        res.status(500).json('Failed to process video');

        // Clean up temporary files
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
});

app.listen(8800, () => {
    console.log('connected to backend')
})