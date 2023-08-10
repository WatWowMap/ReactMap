import { gql } from '@apollo/client'

export const GET_LOGIN_PAGE = gql`
  query LoginPage {
    loginPage
  }
`
