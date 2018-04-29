"use strict"

var MM_PER_KM = 1000000
var MILES_PER_KM = 0.621371
var INCHES_PER_MM = 0.0393

var Main = {}


// TODO: Get rid of this ridiculous "state" thing and make it a config. State can be held by the
// various objects
Main.state = {
    pitch: 12.7,
    rollerDia: 7.93,
    rpm: 0.0,
    slave: { 
        t: 16, 
        x: 433.5, 
        y: -88
    },
    master: { 
        t: 46,
        x: 1300, 
        y: 745
    },
    reset: false,
    hold: false,
    speed: 0,
    height: 1100,
    width: 2200,
    rpmRate: 0.006,
    initAngle: 0.0,
    wheelDia: 676,
    unitConversion: 1,
    rider: {
        frontWheelX: -622.5, // Relative to master gear
        frameOffsetX: -505,
        frameOffsetY: -599,
        wheelOffset: {
            front: Math.random() * 360,
            rear: Math.random() * 360
        }
    },
    limits : {
        sprocket: {
            max: 42,
            min: 8
        },
        chainring: {
            max: 70,
            min: 28
        },
        speed: {
            max: 150
        },
        rpm: {
            max: 200
        }
    }
}
Main.state.wheelCircum = Main.state.wheelDia * Math.PI
Main.state.rider.wheelDia = Main.state.wheelDia

Main.draw = {}
Main.rider = {}
Main.train = {}
Main.road = {}

//on ready
$(function () {
    $("#driver_slider").slider({
        max: Main.state.limits.chainring.max,
        min: Main.state.limits.chainring.min,
        value:  Main.state.master.t,
        slide: changeMaster,
    })
    $("#slave_slider").slider({
        max: Main.state.limits.sprocket.max,
        min: Main.state.limits.sprocket.min,
        slide: changeSlave,
        value:  Main.state.slave.t,
    })
    $("#rpm_slider").slider({
        max: Main.state.limits.rpm.max,
        min: 0,
        slide: changeRPM,
        value:  Main.state.rpm,
        stop: sliderStop
    })
    $("#speed_slider").slider({
        max: Main.state.limits.speed.max,
        min: 0,
        slide: changeSpeed,
        stop: sliderStop
    })
    $("#unit_picker").slider({
        max: 1,
        min: 0,
        slide: changeUnits,
    })
    $("#zoom_picker").slider({
        max: 1,
        min: 0,
        slide: changeZoom,
    })
    $("#hold-picker").slider({
        max: 1,
        min: 0,
        value: 0,
        slide: changeHold,
    })
    init()
})

function changeMaster(event, ui) {
    Main.state.speed = Main.state.rpm * (Main.train.master.t / Main.train.master.slave.t)
        * Main.state.wheelCircum / MM_PER_KM * 60
    Main.state.master.t = ui.value
    Main.state.reset = true
}

function changeSlave(event, ui) {
    Main.state.speed = Main.state.rpm * (Main.train.master.t / Main.train.master.slave.t)
        * Main.state.wheelCircum / MM_PER_KM * 60
    Main.state.slave.t = ui.value
    Main.state.reset = true
}

function changeRPM(event, ui) {
    var rpm = ui.value > Main.state.limits.rpm.max ? Main.state.limits.rpm.max : ui.value
    Main.state.rpm = rpm
    Main.train.master.setSpeed(Main.state.rpm)
    updateSpeedDisplay(Main.state.rpm)
}

function changeSpeed(event, ui) {
    var speed = ui.value
    var rpm = ((speed * MM_PER_KM / 60) / Main.state.wheelCircum /
        (Main.train.master.t / Main.train.master.slave.t))
    Main.state.rpm = rpm > Main.state.limits.rpm.max ? Main.state.limits.rpm.max : rpm
    Main.train.master.setSpeed(Main.state.rpm)
    updateSpeedDisplay(Main.state.rpm)
}

function changeHold(event, ui) {
    if (ui.value === 0) {
        Main.state.hold = false
        $("#hold-tracker").text("CAD")
    } else {
        Main.state.hold = true
        $("#hold-tracker").text("SPD")
    }
}

function changeUnits(event, ui) {
    if (ui.value === 0) {
        Main.state.unitConversion = 1.0
        $("#unitTracker").text("KPH")
    } else {
        Main.state.unitConversion = MILES_PER_KM
        $("#unitTracker").text("MPH")
    }
    updateSpeedDisplay(Main.state.rpm)
}

function changeZoom(event, ui) {
    if (ui.value == 0) {
        Main.draw.animate().viewbox(0, 0, Main.state.width, Main.state.height)
        $("#zoomTracker").text("OFF")
    } else {
        var width = 690
        var x = 1100
        var y = 560
        Main.draw.animate().viewbox({ x: x, y: y, width: width, height: width / 2})
        $("#zoomTracker").text("ON")
    }
}

function sliderStop(event, ui) {
    updateSpeedDisplay(Main.state.rpm)
}


function updateSpeedDisplay(rpm) {
    var speed = rpm * (Main.train.master.t / Main.train.master.slave.t)
        * Main.state.wheelCircum / MM_PER_KM * 60
    $("#speed").text((speed * Main.state.unitConversion).toFixed(1))
    if (speed > Main.state.limits.speed.max) {
        $("#speed").css('color', '#701112')
    } else {
        $("#speed").css('color', 'black')
    }
    $("#speed_slider").slider("value", speed)
    $("#rpm").text(Main.state.rpm.toFixed(1))
    if (rpm > Main.state.limits.rpm.max) {
        $("#rpm").css('color', '#701112')
    } else {
        $("#rpm").css('color', 'black')
    }
    $("#rpm_slider").slider("value", Main.state.rpm)
    var diameterInches = Main.state.wheelDia * INCHES_PER_MM
    $("#gear-inches").text((diameterInches * (Main.state.master.t / Main.state.slave.t)).toFixed(1))
}

function init() {
    $("#m-teeth").text(Main.state.master.t)
    $("#s-teeth").text(Main.state.slave.t)
    Main.draw = SVG("sprockets").viewbox(0, 0,  Main.state.width,  Main.state.height)
        .style("display", "block")
    recreateDrawing()
    updateSpeedDisplay(Main.state.rpm)
    animate()
}

function reset() {
    $("#m-teeth").text( Main.state.master.t)
    $("#s-teeth").text( Main.state.slave.t)
    Main.state.initAngle = Main.train.master.angle
    Main.state.rider.wheelOffset.front = Main.rider.wheel.front.angle
    Main.state.rider.wheelOffset.rear = Main.rider.wheel.front.angle
    recreateDrawing()
    // Running a couple of empty steps seems to help with "floating" limb graphical issue.
    Main.train.step(0)
    Main.rider.step(0)
    Main.road.step()
    if (Main.state.hold) {
        Main.state.rpm = ((Main.state.speed * MM_PER_KM / 60) / Main.state.wheelCircum /
            (Main.train.master.t / Main.train.master.slave.t))
        Main.train.master.setSpeed(Main.state.rpm)
    }
    updateSpeedDisplay(Main.state.rpm)
}

function recreateDrawing() {
    Main.draw.clear()
    Main.train = new Drive.DriveTrain(Main.draw, Main.state)
    Main.rider = new Rider.Rider(Main.draw, Main.train, Main.state.rider)
    Main.road = new Road.Road(Main.draw, Main.rider)
    sort()
}

function sort() {
    Main.rider.pedal.front.foot.svg.back()
    Main.rider.pedal.front.foot.leg.upper.back()
    Main.rider.pedal.front.foot.leg.lower.back()
    Main.rider.pedal.front.crank.back()
    Main.rider.frame.rearSvg.back()
    Main.train.group.back()
    Main.rider.frame.svg.back()
    Main.rider.wheel.front.svg.back()
    Main.rider.wheel.rear.svg.back()
    Main.rider.pedal.rear.crank.back()
    Main.rider.pedal.rear.foot.svg.back()
    Main.rider.pedal.rear.foot.leg.upper.back()
    Main.rider.pedal.rear.foot.leg.lower.back()
    Main.road.group.back()
}

function animate() {
    var previous = 0
    var dt = 0
    var lastReset = 0
    var step = function (timestamp) {
        if (Main.state.reset === true && lastReset > 3) {
            reset()
            lastReset = 0;
            Main.state.reset = false
        }
        dt = timestamp - previous
        previous = timestamp
        Main.train.step(dt)
        Main.rider.step(dt)
        Main.road.step()
        lastReset++;
        window.requestAnimationFrame(step)
    }
    window.requestAnimationFrame(step)
}