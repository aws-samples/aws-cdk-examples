import { Layout, Text, Page } from '@vercel/examples-ui'
import { Chat } from '../components/Chat'

function Home({user}: any) {
  return (
    <Page className="flex flex-col gap-12">
      <section className="flex flex-col gap-6">
        <Text variant="h1">AI Assistant</Text>
        <Text className="text-zinc-600">
          Test our secured AI Assistant powered by Generative AI!
        </Text>
      </section>

      <section className="flex flex-col gap-3">
        <Text variant="h2">AI Assistant:</Text>
        <div className="lg:w-2/3">
          <Chat {...user}/>
        </div>
      </section>
    </Page>
  )
}

export default Home
