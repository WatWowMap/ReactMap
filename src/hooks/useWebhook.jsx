// import React, { Fragment, useState } from 'react'
// import { useMutation } from '@apollo/client'
// import {
//   Snackbar, Dialog, DialogTitle, DialogContent, IconButton, Grid, Checkbox,
// } from '@material-ui/core'
// import { Alert } from '@material-ui/lab'
// import { useTranslation, Trans } from 'react-i18next'

// import Query from '@services/Query'
// import SlideTransition from '@assets/mui/SlideTransition'

// export default function useWebhook({ data, categories }) {
//   const { map: { webhook: name } } = useStatic(state => state.config)
//   const webhookData = useStatic(state => state.webhookData)
//   const setWebhookData = useStatic(state => state.setWebhookData)
//   const classes = useStyles()
//   const { t } = useTranslation()
//   const [addWebhook, { data: addData }] = useMutation(Query.webhook())

//   const response = addData && addData.webhook && addData.webhook.status ? addData.webhook.status : null

//   const [popup, setPopup] = useState(false)
//   const [hook, setHook] = useState({ category: '', exists: null })

//   const handleAlertClose = () => {
//     setHook({ category: '', exists: null })
//   }

//   const setWebhook = () => ({
//     name: (
//       <Trans i18nKey="manageWebhook">
//         {{ name }}
//       </Trans>
//     ),
//     // action: () => handleWebhook(category, dataObj, exists),
//     action: () => setPopup(true),
//     key: 'webhook',
//   })

//   const handleWebhook = (category, dataObj = { }, exists) => {
//     addWebhook({
//       variables: {
//         category,
//         dataObj: exists || dataObj,
//         exists: Boolean(exists),
//       },
//     })
//     if (exists) {
//       setWebhookData({
//         ...webhookData,
//         [category]: webhookData[category].filter(entry => entry.gym_id !== dataObj.id && entry.id !== dataObj.id),
//       })
//     } else {
//       setWebhookData({ ...webhookData, [category]: [...webhookData[category], dataObj] })
//     }
//   }

//   console.log(webhookData)
//   console.log(addData)

//   const StatusAlert = () => (
//     <Snackbar
//       open={Boolean(hook.exists) && Boolean(addData)}
//       onClose={handleAlertClose}
//       TransitionComponent={SlideTransition}
//     >
//       <Alert
//         onClose={handleAlertClose}
//         severity={response ? 'success' : 'error'}
//         variant="filled"
//       >
//         {response ? t(`webhookSuccess${hook.message}`) : t('webhookFailed')}
//       </Alert>
//     </Snackbar>
//   )

//   return { setWebhook, StatusAlert, WebhookDialog }
// }
