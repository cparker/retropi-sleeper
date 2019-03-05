#!/usr/bin/env node

const gpio = require("rpi-gpio");
const process = require("process");
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const slack = require("slack-notify")(SLACK_WEBHOOK_URL);
let slackAlertArmed = true;

const motionPin = process.env.MOTION_PIN || 14;
console.log(`motion pin is ${motionPin}`)
const slackMessage = process.env.SLACK_MESSAGE || `motion detected`;

gpio.setMode(gpio.MODE_BCM);
gpio.setup(motionPin, gpio.DIR_IN, gpio.EDGE_RISING);

let lastMotionTimestamp = new Date().getTime();

// inactivity timeout
const inactivityTimeout = parseInt(
  process.env.INACTIVITY_TIMEOUT_SEC || `${60 * 10}`
);

// poll interval
const pollIntervalSec = process.env.POLL_INTERVAL_SEC || `${30}`;

// delay 60s to give some time for the network to startup

console.log('will start in 60 seconds')
setTimeout(() => {
  console.log(`waiting for change on pin ${motionPin}`)

  gpio.on("change", function(channel, value) {
    console.log(`motion state changed, channel ${channel}, value ${value}`);
    if (value) {
      lastMotionTimestamp = new Date().getTime();
      if (slackAlertArmed) {
        slack.alert({ text: slackMessage, fields: {} });
      }
      slackAlertArmed = false;
    } else {
        console.log(`motion state changed, but value was ${value}, channel ${channel}`)
    }
  });

  setInterval(() => {
    let secondsSinceLastMotion =
      (new Date().getTime() - lastMotionTimestamp) / 1000;
    console.log(`${secondsSinceLastMotion} seconds since last motion`);
    if (secondsSinceLastMotion >= inactivityTimeout) {
      if (!slackAlertArmed) {
	      console.log('re-arming')
	      slackAlertArmed = true;
      }
    }
  }, pollIntervalSec * 1000);
}, 3 * 1000);
