// why dassie? cuz they're soooo cute!!! ^_^
// http://www.youtube.com/watch?v=-svEVVyCM-0&feature=related

//TODO: delegate events (e.g. view collections?);
//TODO: think about how to load all locales from the server (not in this file tho)

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

  var ajax_helpers = {
    //TODO: add error callbacks too?
    _get: function(){
      var args = getAjaxArguments(arguments);

      $.ajax({
        type: "GET",
        url: args.url,
        data: $.extend({format: "json", _method: "GET"}, args.data),
        success: args.callback
      });
    },
    _post: function(){
      var args = getAjaxArguments(arguments);
      $.ajax({
        type: "POST",
        url: args.url,
        data: $.extend({format: "json", _method: "POST"}, args.data),
        success: args.callback
      });
    },
    _put: function(){
      var args = getAjaxArguments(arguments);
      $.ajax({
        type: "POST",
        url: args.url,
        data: $.extend({format: "json", _method: "PUT"}, args.data),
        success: args.callback
      });
    },
    _delete: function(){
      var args = getAjaxArguments(arguments);
      $.ajax({
        type: "POST",
        url: args.url,
        data: $.extend({format: "json", _method: "DELETE"}, args.data),
        success: args.callback
      });
    }
  }

  dassie.Model = function(data){
    this.initEventEmitter();
    if(typeof data === "object"){
      this.data = data;
    }else{
      this.data = {};
    }

    if(this.construct !== undefined) this.construct.apply(this,arguments);
  }
  $.extend(
    dassie.Model.prototype,
    eventEmitter,
    {
      clear: function(){
        this.data = {};
        this.trigger("clear",this.data);
      },
      setData: function(data){
        if(typeof data === "object"){
          for(prop in data){
            if(data.hasOwnProperty(prop)){
              this.data[prop] = data[prop];
            }
          }
        }

        this.trigger("setData",data);
      },

      getData: function(opt){
        if(typeof opt === "undefined") return this.data;

        if(typeof opt === "string"){
          return this.data[opt]
        }

        if(typeof opt === "object"){
          if(opt instanceof Array){
            var data_subset = {};
            
            for(i=0,l=opt.length;i<l;i++){
              data_subset[opt[i]] = this.data[opt[i]];
            }
            return data_subset;
          }
        }
      },
      /* Sends a request to update the server-side representation of the model 
       * and load model's properties to update the object's data
       */

      sync: function(data,callback){ 
        if(typeof this.syncPath !== "function"){
          throw new Error("sync():"+ typeof this.syncPath +"is not a function!");
        }
        var self = this;
        
        // asynchronous synchroniser lol
        ajax_helpers._put(this.syncPath(), data, function(response){
          $.extend(self.data,response);

          self.trigger("update");
          if(typeof callback === "function") callback(response);
        });
      },
      /* works just like sync but wipes object's data before adding received properties to it*/
      clean_sync: function(data,callback){
        if(typeof this.syncPath !== "function"){
          throw new Error("clean_sync(): "+ typeof this.syncPath +" is not a function!");
        }
        var self = this;
        ajax_helpers._put(this.syncPath(), data, function(response){
          delete self.data;
          self.data = response;

          self.trigger("update");
          if(typeof callback === "function") callback(response);
        });
      },
      /* Sends a request to get the model's properties, and updates the object's data */
      load: function(data,callback){
        var self = this;
        if(typeof this.loadPath !== "function"){
          throw new Error("load():" + typeof this.loadPath + " is not a function!");
        }
        ajax_helpers._get(this.loadPath(), data, function(response){
          $.extend(self.data,response);

          self.trigger("update");
          if(typeof callback === "function") callback(response);
        });
      },
      //TODO(maybe): reload() to wipe object's data and load it

      /* Sends a request to create a new server-side representation of the model */
      saveNew: function(data,callback){
        //TODO
      },
      /* Sends a request to destroy the server-side representation of the model */
      destroy: function(data,callback){
        //TODO
      }
    }
  );
  //static methods:
  $.extend(dassie.Model, ajax_helpers);

  function getAjaxArguments(args){
    var url, data, callback;
    url = args[0];

    if(args.length == 2 && args[1] !== undefined){
      if(typeof args[1] === "object"){
        data = args[1];
      }else if(typeof args[1] === "function"){
        callback = args[1]
      }else{
        throw new Error("getAjaxArguments(): 2nd argument must be an object or a function");
      }
    }else{
      if(args[1] !== undefined && typeof args[1] !== "object"){
        throw new Error("getAjaxArguments(): 2nd argument must be an object or undefined");
      }
      if(args[2] !== undefined && typeof args[2] !== "function"){
        throw new Error("getAjaxArguments(): 3rd argument must be a function or undefined");
      }
      data = args[1];
      callback = args[2];
    }
    return {url: url, data: data, callback: callback};
  }

  dassie.Controller = function(){
    if(this.construct !== undefined) this.construct.apply(this,arguments);
  }

  dassie.View = function(opts){
    if(opts === undefined) opts = {};
    $.extend(this, opts);
    this.initEventEmitter();
    if(this.construct !== undefined) this.construct.apply(this,arguments);
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
