#!/usr/bin/env node

const gpio = require('rpi-gpio')
const { exec } = require('child_process')
const process = require('process')
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const slack = require('slack-notify')(SLACK_WEBHOOK_URL)
let slackAlertArmed = true

const motionPin = 14
const lightRelayPin = 2

gpio.setMode(gpio.MODE_BCM)
gpio.setup(motionPin, gpio.DIR_IN, gpio.EDGE_RISING)
gpio.setup(lightRelayPin, gpio.DIR_OUT)

let lastMotionTimestamp = (new Date()).getTime()

// command to put the display to sleep
const sleepMonitorCommand = process.env.SLEEP_MON || 'vcgencmd display_power 0'

// command to wake up the display
const wakeMonitorCommand = process.env.WAKE_MON || 'vcgencmd display_power 1'

// inactivity timeout
const inactivityTimeout = parseInt(process.env.INACTIVITY_TIMEOUT_SEC || `${60 * 10}`)

// poll interval
const pollIntervalSec = process.env.POLL_INTERVAL_SEC || `${30}`

// delay 60s to give some time for the network to startup

setTimeout( () => {

	gpio.on('change', function(channel, value) {
	   console.log(`motion state changed, value ${value}`)
	   if (value) {
		   lastMotionTimestamp = (new Date()).getTime()
		   exec(wakeMonitorCommand, (err, stdout, stderr) => {
		      console.log(`stdout: ${stdout}`);
		      console.log(`stderr: ${stderr}`);
		   })
		   gpio.output(lightRelayPin, true)
		   if (slackAlertArmed) { slack.alert({text: 'arcade cabinet motion detected', fields: {}}) }
		   slackAlertArmed = false
	   }
	})

	setInterval(() => {
	   let secondsSinceLastMotion = ( (new Date()).getTime() - lastMotionTimestamp ) / 1000
	   console.log(`${secondsSinceLastMotion} seconds since last motion`)
	   if (secondsSinceLastMotion >= inactivityTimeout) {
	      exec(sleepMonitorCommand, (err, stdout, stderr) => {
		 console.log(`stdout: ${stdout}`);
		 console.log(`stderr: ${stderr}`);
	      })
	      console.log('sleeping now')
	      gpio.output(lightRelayPin, false)
	      slackAlertArmed = true
	   }

	}, pollIntervalSec * 1000)

}, 60 * 1000)


// start with marquee on
//gpio.output(lightRelayPin, true)
