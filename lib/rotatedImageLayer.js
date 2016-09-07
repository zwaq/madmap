// taken from https://github.com/Leaflet/Leaflet/issues/4029
L.rotatedImageOverlay = function(url, bounds, options) {
    return new L.RotateImageLayer(url, bounds, options);
};
// A quick extension to allow image layer rotation.
L.RotateImageLayer = L.ImageOverlay.extend({
    options: {rotation: 0},
    _animateZoom: function(e){
        L.ImageOverlay.prototype._animateZoom.call(this, e);
        var img = this._image;
        img.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.rotation + 'deg)';
    },
    _reset: function(){
        L.ImageOverlay.prototype._reset.call(this);
        var img = this._image;
        img.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.rotation + 'deg)';
    }
});