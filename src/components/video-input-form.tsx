import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileType, FileVideo, RefreshCw, Upload, UploadCloud } from "lucide-react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";
import { Progress } from "./ui/progress";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

const statusMessages = {
    converting: {
        icon: <RefreshCw className="w-4 h-4 ml-2" />,
        text: 'Convertendo...'
    },
    generating: {
        icon: <FileType className="w-4 h-4 ml-2" />,
        text: 'Transcrevendo..'
    },
    uploading: {
        icon: <UploadCloud className="w-4 h-4 ml-2" />,
        text: 'Carregando...'
    },
    success: {
        icon: <CheckCircle2 className="w-4 h-4 ml-2" />,
        text: 'Sucesso!'
    },
}

interface VideoInputFormProps {
    onVideoUploaded: (videoId: string) => void
}
export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {

    const [videoFile, setVideoFile] = useState<File | null>(null)
    const [progressConvert, setProgressConvert] = useState(0)
    const [status, setStatus] = useState<Status>('waiting')
    const promptInputRef = useRef<HTMLTextAreaElement>(null)

    function handleFileSelected(event: ChangeEvent<HTMLInputElement>) { 
        const { files } = event.currentTarget
        
        if(!files) {
            setProgressConvert(0)
            return
        }

        const selectedFile = files[0]

        setVideoFile(selectedFile)

    }

    async function convertVideoToAudio(video: File) {
        console.log(' Convert started.')

        const ffmpeg = await getFFmpeg()

        await ffmpeg.writeFile('input.mp4', await fetchFile(video))

        //ffmpeg.on('log', console.log)
        
        ffmpeg.on('progress', progress => {
            setProgressConvert(Math.round(progress.progress * 100))
            console.log("progress: " + Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3',
        ])

        const data = await ffmpeg.readFile('output.mp3')
        
        const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
        const audioFile =  new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg'
        })

        console.log('Convert finished.')

        return audioFile;
    }

    async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        
        const prompt = promptInputRef.current?.value

        if(!videoFile) return
    
        // converter video em audio
        setStatus('converting')
        const audioFile = await convertVideoToAudio(videoFile)

        const data = new FormData()
        
        data.append('file', audioFile)
        
        setStatus('uploading')
        const response = await api.post('/videos', data)

        const videoId = response.data.video.id

        setStatus('generating')
       
        await api.post(`/videos/${videoId}/transcription`, {
            prompt,
        })

        setStatus('success')
        onVideoUploaded(videoId)
    }

    const previewURL = useMemo(() => {
        if(!videoFile) return null

        return URL.createObjectURL(videoFile)
    }, [videoFile])

    return (
        <form onSubmit={handleUploadVideo} className="space-y-6">
            <label 
            htmlFor="video"
            className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/10"
            >
                {previewURL ? (
                    <video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
                ): (
                    <>
                        <FileVideo className="w-4 h-4" />
                        Selecione um video
                    </>
                )}
            </label>
            <Progress value={progressConvert} />
            <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />

            <Separator />

            <div className="space-y-2">
            <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
            <Textarea 
                ref={promptInputRef}
                disabled={status !== 'waiting'}
                id="transcription_prompt" 
                className="h-20 leading-relaxed" 
                placeholder="Inclua palavras-chaves mencionadas no vídeo separadas por vírgula"
            />
            </div>

            <Button 
                data-success={status === 'success'}
                type="submit" 
                variant="secondary" 
                disabled={status !== 'waiting'}
                className="w-full data-[success=true]:bg-emerald-400" 
            >
                {status === 'waiting' ? (
                    <>
                        Carregar vídeo
                        <Upload className="w-4 h-4 ml-2" /> 
                    </>
                ) : (
                    <>
                        {statusMessages[status].text}
                        {statusMessages[status].icon}
                    </>
                )}
            </Button>
        </form>
    )
}