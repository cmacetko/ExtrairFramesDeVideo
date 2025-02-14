const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const express = require("express");
const bodyParser = require("body-parser");
const axios = require('axios');
const { pipeline } = require('stream/promises');

var app = express();
app.use(bodyParser.json());

app.use('/tmp', express.static(path.join(__dirname, 'tmp')));

app.post("/executar", async function(req, res){

    try {

        if(!req.body.url)
        {

            return res.status(400).json({ Message: "Preencha o Campo 'URL'" });

        }

        if(!req.body.url.endsWith('.mp4')) 
        {

            return res.status(400).json({ Message: "Preeencha a 'URL' com um arquivo MP4" });

        }

        const InfFilename = uuidv4();
        const InfTmpDir = path.join(__dirname, "tmp", InfFilename);

        if( !fs.existsSync(InfTmpDir) )
        {

            fs.mkdirSync(InfTmpDir, { recursive: true });

        }

        const InfArquivoVideo = path.join(InfTmpDir, "Video.mp4");

        const response = await axios({
        url: req.body.url,
        method: 'GET',
        responseType: 'stream'
        });

        if(response.status !== 200) 
        {

            return res.status(400).json({ Message: "Falha em Obter Arquivo da URL Informada: " + response.status });

        }

        const contentType = response.headers['content-type'];

        if(!contentType || !contentType.includes('video/mp4')) 
        {

            return res.status(400).json({ Message: "A URL informada não contém um arquivo MP4" });

        }
        
        await pipeline(response.data, fs.createWriteStream(InfArquivoVideo));

        try {

            await exec("ffmpeg -i " + InfArquivoVideo + " -vf fps=1/5 -t 50 " + InfTmpDir + "/%d.jpg");
    
            var InfImagens = [];
    
            for( let i = 1; i <= 10; i++ )
            {
            
                var InfImagem  = i + ".jpg";
    
                if( fs.existsSync(path.join(InfTmpDir, InfImagem)) )
                {
    
                    InfImagens.push("/tmp/" + InfImagem);
    
                }
    
            }

            if( InfImagem.length > 0 )
            {
    
                res.json({ arquivos: InfImagens });
    
            }else{
    
                res.status(400).json({ Message: "A conversão nao pode ser realizada"});

            }
    
        } catch (ex) {
                
            res.status(400).json({ Message: "Falha em Executar FFmpeg: " + ex.message });

        }

    } catch (ex) {

        res.status(400).json({ Message: "Falha em Executar Funcao: " + ex.message });

    }

});

app.listen(8019, function(){ 
    
    console.log("API Iniciada");

});