import { useQuery } from "react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { api } from "@/lib/axios";

interface Prompts {
    id: string
    template: string
    title: string
}
interface PromptSelectProps {
    onPromptSelected: (template: string) => void
}

export function PromptSelect({ onPromptSelected }: PromptSelectProps) {
    const { data, isLoading } = useQuery('prompts', async () => {
        const response = await api.get<Prompts[]>('/prompts')
        return response.data
    }, { refetchOnWindowFocus: false })

    function handlePromptSelected(promptId: string) {
        const selectedPrompt = data?.find(prompt => prompt.id === promptId)
        if(!selectedPrompt) return 

        onPromptSelected(selectedPrompt.template)
    }

    return (
        <Select defaultValue="gtp3.5" onValueChange={handlePromptSelected} disabled={isLoading}>
            <SelectTrigger>
                <SelectValue placeholder="Selecione um prompt">Selecione o prompt</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {
                    data?.map(prompt => (
                        <SelectItem key={prompt.id} value={prompt.id}>{prompt.title}</SelectItem>
                    ))
                }
            </SelectContent>
        </Select>
    )
}