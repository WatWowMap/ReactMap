import React, { useState } from 'react'
import {
  DialogContent,
  DialogTitle,
  Dialog,
  AppBar,
  Tabs,
  Tab,
  IconButton,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@material-ui/core'
import { Clear, Person } from '@material-ui/icons'
import { useTranslation, Trans } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Action from '@components/layout/general/Action'
import TabPanel from '@components/layout/general/TabPanel'

const ignoredKeys = ['message', 'error', 'statusCode', 'status', 'profile', 'name']

export default function Manage({ toggleDialog, Icons, isMobile }) {
  const { t } = useTranslation()
  const classes = useStyles()
  const webhookData = useStatic(s => s.webhookData)
  // const setWebhookData = useStatic(s => s.setWebhookData)

  const [tabValue, setTabValue] = useState(0)
  const [help, setHelp] = useState(false)
  const [addNew, setAddNew] = useState(false)
  const [webhookName] = useState(webhookData.name)

  // console.log(webhookData)

  const footerButtons = [
    { name: 'help', action: () => setHelp(true), icon: 'HelpOutline' },
    { name: 'addNew', action: () => setAddNew(true), icon: 'Add' },
    { name: 'close', action: toggleDialog(false), icon: 'Close' },
  ]

  const filteredData = Object.keys(webhookData).filter(key => !ignoredKeys.includes(key))
  return (
    <>
      <DialogTitle className={classes.filterHeader}>
        <Trans i18nKey="manageWebhook">
          {{ name: webhookName }}
        </Trans>
        <IconButton
          onClick={toggleDialog(false, '', 'webhook')}
          style={{ position: 'absolute', right: 5, top: 5 }}
        >
          <Clear style={{ color: 'white' }} />
        </IconButton>
      </DialogTitle>
      <AppBar position="static">
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="secondary"
          variant="fullWidth"
          style={{ backgroundColor: '#424242', width: '100%' }}
        >
          {filteredData.map((each) => (
            <Tab
              key={each}
              icon={each === 'human'
                ? <Person style={{ color: 'white ' }} />
                : <img src={Icons.getMisc(each)} style={{ maxWidth: 20, height: 'auto' }} />}
              style={{ width: 40, minWidth: 40 }}
            />
          ))}
        </Tabs>
      </AppBar>
      <DialogContent>
        {filteredData.map((key, i) => (
          <TabPanel value={tabValue} index={i} key={key}>
            <TableContainer component={Paper}>
              {webhookData[key][0] && (
                <Table style={{ width: '95%' }}>
                  <TableHead>
                    <TableRow>
                      {Object.keys(webhookData[key][0]).map(each => (
                        <TableCell align="right" key={each}>{t(each)}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhookData[key].map((row) => (
                      <TableRow key={row.uid || row.id}>
                        {Object.entries(row).map(([rowKey, value]) => (
                          <TableCell key={rowKey}>{value}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          </TabPanel>
        ))}
      </DialogContent>
      <Grid
        className="filter-footer"
        container
        justifyContent={isMobile ? 'center' : 'flex-end'}
        alignItems="center"
      >
        {footerButtons.map(button => (
          <Grid item xs={4} key={button.name}>
            <Action name={button.name} action={button.action} icon={button.icon} color="white" />
          </Grid>
        ))}
      </Grid>
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        maxWidth="xs"
        open={addNew}
        onClose={() => setAddNew(false)}
      >
        addNew
      </Dialog>
      <Dialog
        classes={{
          scrollPaper: classes.scrollPaper,
          container: classes.container,
        }}
        maxWidth="xs"
        open={help}
        onClose={() => setHelp(false)}
      >
        help
      </Dialog>
    </>
  )
}
