"use strict"

var MM_PER_KM = 1000000
var Main = {}

 Main.state = {
    pitch: 12.7,
    rollerDia: 7.93,
    rpm: 0,
    slave: { 
        t: 18, 
        x: 430, 
        y: -81
    },
    master: { 
        t: 48,
        x: 1000, 
        y: 745
    },
    height: 1100,
    width: 1800,
    rpmRate: 0.006,
    initAngle: 0.0,
    wheelCircum: 2123.71,
    rider: {
        frontWheelX: -632, // Relative to master gear
        frameOffsetX: -495,
        frameOffsetY: -590,
        wheelOffset: {
            front: Math.random() * 360,
            rear: Math.random() * 360
        }
    }
}


Main.draw = {}
Main.rider = {}
Main.train = {}

//on ready
$(function () {
    $("#driver_slider").slider({
        max: 70,
        min: 12,
        value:  Main.state.master.t,
        slide: changeMaster
    })
    $("#slave_slider").slider({
        max: 48,
        min: 8,
        slide: changeSlave,
        value:  Main.state.slave.t
    })
    $("#rpm_slider").slider({
        max: 270,
        min: 0,
        slide: changeRPM,
        value:  Main.state.rpm
    })
    $("#speed_slider").slider({
        max: 258,
        min: 0,
        slide: changeSpeed
    })
    $("#crank_length_slider").slider({
        max: 10,
        min: 0,
    })
    init()
})

function init() {
    Main.draw = SVG("sprockets").viewbox(0, 0,  Main.state.width,  Main.state.height)
    reset()
    animate()
}

function reset() {
    $("#m-teeth").text( Main.state.master.t)
    $("#s-teeth").text( Main.state.slave.t)
    $("#rpm").text( Main.state.rpm)
    if (Main.train.master !== undefined) {
         Main.state.initAngle = Main.train.master.angle
         Main.state.rider.wheelOffset.front = Main.rider.wheel.group2.transform().rotation
         Main.state.rider.wheelOffset.rear = Main.rider.wheel.group.transform().rotation
    }
    Main.draw.clear()
    Main.train = new Drive.DriveTrain(Main.draw,  Main.state)
    Main.rider = new Rider.Rider(Main.draw, Main.train,  Main.state.rider)
    updateSpeed( Main.state.rpm)
    sort()
}

function sort() {
    Main.rider.legs.sgroup.back()
    Main.rider.groups.pedal.back()
    Main.rider.groups.crank.back()  
    Main.train.group.back()
    Main.rider.groups.frame.back()
    Main.rider.wheel.group.back()
    Main.rider.wheel.group2.back()
}

function animate() {
    var previous = 0
    var dt = 0
    var step = function (timestamp) {
        dt = timestamp - previous
        previous = timestamp
        Main.train.step(dt)
        Main.rider.step(dt)
        window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
}

function changeMaster(event, ui) {
     Main.state.master.t = ui.value
    reset()
}

function changeSlave(event, ui) {
     Main.state.slave.t = ui.value
    reset()
}

function changeRPM(event, ui) {
    Main.state.rpm = ui.value
    Main.train.master.setSpeed( Main.state.rpm)
    updateSpeed(Main.state.rpm)
}

function changeSpeed(event, ui) {
    Main.state.rpm = ((ui.value * MM_PER_KM / 60) / Main.state.wheelCircum / 
        (Main.train.master.t / Main.train.master.slave.t))
    Main.train.master.setSpeed(Main.state.rpm)
    updateSpeed(Main.state.rpm)
}

function updateSpeed(rpm) {
    var speed = rpm * (Main.train.master.t / Main.train.master.slave.t) 
        * Main.state.wheelCircum / MM_PER_KM * 60
    $("#speed").text(speed.toFixed(1))
    $("#speed_slider").slider("value", speed)
    $("#rpm").text(Main.state.rpm.toFixed(1))
    $("#rpm_slider").slider("value", Main.state.rpm)
}