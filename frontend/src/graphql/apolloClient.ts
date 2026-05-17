import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URI || 'http://localhost:8000/graphql/',
  }),
  cache: new InMemoryCache(),
});

export default client;