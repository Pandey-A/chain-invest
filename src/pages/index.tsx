import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>ChainIndex</title>
        <meta name="description" content="ChainIndex homepage" />
      </Head>
      <main className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-semibold">Home</h1>
      </main>
    </>
  )
}
