// why dassie? cuz they're soooo cute!!! ^_^
// http://www.youtube.com/watch?v=-svEVVyCM-0&feature=related

dassie = {};
dassie.views = {};
dassie.models = {};
dassie.controllers = {};

(function($){
  var global = this;

  var eventEmitter = {
    initEventEmitter: function(){
      this._eH = {}; //events handler
    },
    bind: function(event, callback){
      if(this._eH[event] === undefined){
        this._eH[event] = [];
      }
      this._eH[event].push(callback);
    },
    trigger: function(event,data){
      if(this._eH[event] !== undefined){
        for(i=0, l = this._eH[event].length; i < l; i++){
          this._eH[event][i](data);
        }
      }
    }
  };

  dassie.Model = function(data){
    this.initEventEmitter();
    if(typeof data === "object"){
      this._data = data;
    }else{
      this._data = {};
    }
    this.construct.apply(this,arguments);
  }
  $.extend(
    dassie.Model.prototype,
    eventEmitter,
    {
      clear: function(){
        this._data = {};
        this.trigger("clear",this._data);
      },
      setData: function(data){
        if(typeof data === "object"){
          for(prop in data){
            if(data.hasOwnProperty(prop)){
              this._data[prop] = data[prop];
            }
          }
        }

        this.trigger("setData",data);
      },

      getData: function(opt){
        if(typeof opt === "undefined") return this._data;

        if(typeof opt === "string"){
          return this._data[opt]
        }

        if(typeof opt === "object"){
          if(opt instanceof Array){
            var data_subset = {};
            
            for(i=0,l=opt.length;i<l;i++){
              data_subset[opt[i]] = this._data[opt[i]];
            }
            return data_subset;
          }
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
    this.construct.apply(this,arguments);
  }

  dassie.View = function(opts){
    if(opts === undefined) opts = {};
    $.extend(this, opts);
    this.initEventEmitter();
    this.construct.apply(this,arguments);
    //TODO (maybe, when dassie is cool enough :): this.delegateEvents();
  }

  $.extend(
    dassie.View.prototype,
    eventEmitter
  );

  //helper functions

  var extend =  function(props,static_props){
    var parent = this;
    var child;

    child = function(){
      parent.apply(this,arguments);
    };

    $.extend(child,parent,static_props)

    // using surrogate object to set child's prototype chain to inherit from parent
    var F = function(){ this.constructor = child; };
    F.prototype = parent.prototype;
    child.prototype = new F;

    $.extend(child.prototype,props)
    
    return child;
  }

  dassie.Model.extend = dassie.Controller.extend = dassie.View.extend = extend;
})(jQuery);
