#!/usr/bin/env node

const { exec } = require('child_process')
const _ = require('underscore')
const process = require('process')

process.title = 'retropi-sleeper'

// polling interval in seconds
const pollTtyIntervalSec = process.env.POLL_INTERVAL_SEC || `${5}`

// a command that checks the last access time of a tty and reports in unix seconds
const ttyTimestampCommand = process.env.TTY_COMMAND || `stat -f "%a" /dev/tty`

// issue the sleep monitor command after this many seconds of inactivity on the tty
const inactiveTimeoutSec = parseInt(process.env.INACTIVE_SEC || `${5 * 60 }`)

// command to put the display to sleep
const sleepMonitorCommand = process.env.SLEEP_MON || 'echo sleepy time'

// command to wake up the display
const wakeMonitorCommand = process.env.WAKE_MON || 'echo wakey time'

console.log('Pass parameters with environment variables like: POLL_INTERVAL_SEC=xxx ./index.js')
console.log(`POLL_INTERVAL_SEC set to ${pollTtyIntervalSec}`)
console.log(`TTY_COMMAND set to ${ttyTimestampCommand}`)
console.log(`INACTIVE_SEC set to ${inactiveTimeoutSec}`)
console.log(`SLEEP_MON is ${sleepMonitorCommand}`)
console.log(`WAKE_MON is ${wakeMonitorCommand}`)

// throttle the calls to monitof off / on.  No need to call so often.  Who knows the cost.
let monitorOnThrottled = _.throttle(() => {
  console.log('-- turning monitor on --')
  exec(wakeMonitorCommand, (err, stdout, stderr) => {
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  })
}, 15000, {trailing:false})

let monitorOffThrottled = _.throttle(() => {
  console.log('-- turning monitor off --')
  exec(sleepMonitorCommand, (err, stdout, stderr) => {
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  })
}, 15000, {trailing:false})


let checkForInactivity = () => {

  console.log('checking for inactivity')

  exec(ttyTimestampCommand, (err, stdout, stderr) => {
    console.log(`TTY last access time sec ${stdout}`)
    let lastAccessSec = parseInt(stdout)
    let currentTimeSec = (new Date()).getTime() / 1000
    let idleTimeSec = currentTimeSec - lastAccessSec
    console.log(`idle for ${idleTimeSec} seconds`)
    if (idleTimeSec > inactiveTimeoutSec) {
      monitorOffThrottled()
    } else {
      monitorOnThrottled()
    }

  })
}

 
// check for inactivity according to the configured polling interval
setInterval(checkForInactivity, parseInt(pollTtyIntervalSec * 1000))
