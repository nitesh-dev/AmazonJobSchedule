import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { json } from 'stream/consumers';

const supabase = createClient(
    'https://iwhfvdwcsfllmnvvwtvu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3aGZ2ZHdjc2ZsbG1udnZ3dHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3NzQ4NDcsImV4cCI6MjA3MTM1MDg0N30.C81e0a9D-mWDOCXQrgswdFLOMQEa-D5-RVIJIwUMGLg'
);




interface ResponseType {
    url: string,
    time: string,
    payload: string,
    method: string,
    response: any
}


let filename = 'logs.txt'

async function fetch(offset: number, limit: number, skipTotalCount: boolean) {

    let size = 0

    if (!skipTotalCount) {
        const { data, count, error } = await supabase
            .from('logs')
            .select('*', { count: 'exact', head: true })

        if (error) throw error;


        size = count ? count : 0
    }

    const { data, error } = await supabase
        .from('logs')
        .select().order('created_at', { ascending: false }).range(offset, offset + limit)

    if (error) throw error;


    for (const ele of data as { id: number, data: ResponseType[] }[]) {
        let id = ele.id
        console.log(`On id: ${id}`)
        // console.log({ d: element.id })


        for (const element of ele.data) {
            // console.log(element.url)
            if (element.url.includes('graphql')) {
                // console.log({d: element.response.data}) searchScheduleCards.scheduleCards
                let jobsCount = element.response.data.searchJobCardsByLocation?.jobCards?.length
                let shiftCount = element.response.data.searchScheduleCards?.scheduleCards?.length

                let logText = `jobs: ${jobsCount} | shift: ${shiftCount}`
                // console.log(logText)
                await appendFile(logText)

                if (jobsCount) await appendFile(JSON.stringify({ jobs: element.response.data.searchJobCardsByLocation.jobCards }))
                if (shiftCount) await appendFile(JSON.stringify({ shifts: element.response.data.searchScheduleCards.scheduleCards }))

            } else if (element.url.includes('create-application')) {
                console.log({ id, create_application: { element } })
                await appendFile(JSON.stringify({ id, create_application: { element } }))
            } else if (element.url.includes('update-application')) {
                console.log('Update application')
                await appendFile(JSON.stringify({id, update_application: {element}}))
            } else if (element.url.includes('update-workflow-step-name')) {
                console.log('Update application steps')
                await appendFile(JSON.stringify({id, update_steps: {element}}))
            }
            // console.log(element.response)
        }

    }

    return { count: data.length, total: size };

}



async function appendFile(text: string) {

    await fs.appendFile('./' + filename, '\n' + text)
}


async function start() {
    let offset = 0
    let limit = 10
    let totalRow = 0


    await fs.writeFile('./' + filename, '')


    while (true) {


        let { count, total } = await fetch(offset, limit, offset != 0)

        if (offset == 0) {
            totalRow = total
        }
        offset += count
        console.log(`offset: ${offset} | rows: ${totalRow}`)
        if (offset >= totalRow) return
    }
}


start()