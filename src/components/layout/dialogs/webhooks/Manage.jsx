import React, { useState } from 'react'
import {
  DialogContent,
  Dialog,
  AppBar,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@material-ui/core'
import { Person } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import useStyles from '@hooks/useStyles'
import Footer from '@components/layout/general/Footer'
import TabPanel from '@components/layout/general/TabPanel'
import Header from '@components/layout/general/Header'

const ignoredKeys = ['message', 'error', 'statusCode', 'status', 'profile', 'name']

export default function Manage({ toggleDialog, Icons }) {
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
      <Header name={webhookName} action={toggleDialog(false, '', 'webhook')} />
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
      <Footer options={footerButtons} />
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
