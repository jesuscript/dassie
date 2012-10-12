// why dassie? cuz they're soooo cute!!! ^_^
// http://www.youtube.com/watch?v=-svEVVyCM-0&feature=related

dassie = {};
dassie.views = {};
dassie.models = {};
dassie.controllers = {};

(function($){
  // TODO: build in route support
  dassie.Model = function(data){
    this._data = {};
    this._$o = $(); // empty jQuery object to use for event emitting
    this.setData(data);
    this.construct.apply(this,arguments);
  }
  $.extend(dassie.Model.prototype,{
    bind: function(){
      this._$o.bind(arguments);
    },
    trigger: function(){
      this._$o.trigger(arguments);
    },
    setData: function(data){
      if(typeof data === "object"){
        for(prop in data){
          if(data.hasOwnProperty(prop)){
            this._data[prop] = data[prop];
          }
        }
        this.trigger("setData");
      }
    },

    getData: function(opt){
      if(typeof opt === "undefined") return this._data;

      if(typeof opt === "object"){
        var prop_subset = {};
        
        for(prop in opt){
          if(opt.hasOwnProperty(prop)){
            prop_subset[prop] = this._data[prop];
          }
        }
        return prop_subset;
      }

      if(typeof opt === "string"){
        return this._data[opt]
      }
    },
    
    save: function(data,callback){
      //TODO
    },

    reload: function(data,callback){
      //TODO
    }
  });

  dassie.Controller = function(){
    if(typeof this.preload === 'object' && !$.isEmptyObject(this.preload)){
      // asynchronous preloading:
      for(prop in this.preload){
        if(this.preload.hasOwnProperty(prop)){
          (function(p){
            // callback for preloaded properties:
            this.preload[prop](function(res){
              this[p] = res;
              onReady.apply(this,arguments); // constructs if done preloading
            }.bind(this));
          }).call(this,prop);
        }
      }
    }else{
      onReady.apply(this,arguments);
    }
  }

  function onReady(){
    if(typeof this.preload === "object"){
      //check if we preloaded everything we wanted to
      for(prop in this.preload){
        if(this.preload.hasOwnProperty(prop) && !this.hasOwnProperty(prop)){
          return;
        }
      }
      this.preload = undefined;
    }
    this.construct.apply(this,arguments);
  }

  dassie.View = function(opt){
    this.$el = opt.$el;
    this._$o = $();
    this.construct.apply(this,arguments);
  }

  $.extend(dassie.View.prototype,{
    bind: function(){
      this._$o.bind(arguments);
    },
    trigger: function(){
      this._$o.trigger(arguments);
    }
  });


  var extend =  function(props,static_props){
    $.extend(this.prototype,props);
    $.extend(this,static_props);
    return this;
  }

  dassie.Model.extend = dassie.Controller.extend = dassie.View.extend = extend;
})(jQuery);
