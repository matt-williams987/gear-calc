Road = {}

Road.Road = function(draw, rider) {
    this.rider = rider
    this.draw = draw
    this.group = draw.group()
    this.sky = this.group.rect(Main.state.width, Main.state.height).fill("#dcf0fa")
    this.road = this.group.rect(Main.state.width, 300).fill("#565656").move(0, Main.state.height - 300)
    this.lgroup = this.group.group()
    this.lineLength = 950
    this.lineGap = 2300
    var lineWidth = 40
    var lineOffset = 40
    var linePlace = 1010
    var progress = 0
    for (var i = -1 ; i < 2 ; i++) {
        var origin = lineOffset + (i * (this.lineLength + this.lineGap))
        this.lgroup.polygon([
            [origin, linePlace],
            [origin + this.lineLength, linePlace],
            [origin + this.lineLength + lineOffset, linePlace + lineWidth],
            [origin + lineOffset, linePlace + lineWidth]]).fill("#d2b746")
    }
}

Road.Road.prototype.step = function() {
    // This causes a heck of a lot of repainting, I think mainly because the group extends outside
    // the viewbox. Alternatives like redrawing polygons every frame inside the viewbox don't seem
    // to do much to improve things, as removing elements also causes a paint.
    this.lgroup.move(-(Drive.toRad(this.rider.wheel.front.angle) * 
        (this.rider.wheel.rear.wheelDia / 2)) % 
        (this.lineLength + this.lineGap) , 0) 
}