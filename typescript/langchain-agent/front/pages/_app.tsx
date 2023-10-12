import type { AppProps } from 'next/app'
import type { NextApiRequest } from 'next';
// import type { LayoutProps } from '@vercel/examples-ui/layout'
import { Amplify,  withSSRContext} from 'aws-amplify';

import { withAuthenticator } from '@aws-amplify/ui-react';

import '@aws-amplify/ui-react/styles.css';
import './globals.css'
import awsExports from '../src/aws-exports';

Amplify.configure(awsExports);

export async function getServerSideProps(req: any ) {
  const {Auth} = withSSRContext(req);
  try {
    const user = await Auth.currentAuthenticatedUser();
    return {
      props: {
        user,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      props: {},
    };
  }
}

function App({ Component, pageProps, user }: any) {
  return (
      <Component {...pageProps} user={user}/>
  )
}

export default withAuthenticator(App)
