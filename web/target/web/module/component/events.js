define(function() {

    // Events
    // -----------------
    // Thanks to:
    //  - https://github.com/documentcloud/backbone/blob/master/backbone.js
    //  - https://github.com/joyent/node/blob/master/lib/events.js


    // Regular expression used to split event strings
    var eventSplitter = /\s+/;


    // A module that can be mixed in to *any object* in order to provide it
    // with custom events. You may bind with `on` or remove with `off` callback
    // functions to an event; `trigger`-ing an event fires all callbacks in
    // succession.
    //
    //     var object = new Events();
    //     object.on('expand', function(){ alert('expanded'); });
    //     object.trigger('expand');
    //
    // 介绍使用方法，这个模块可以混入任何对象之中，实现对自定义事件的资瓷~
    function Events() {
    }


    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    // 将空格分割的事件绑定给对象，事件名为all的话，事件回调函数在任何事件被触发时都会调用。
    Events.prototype.on = function(events, callback, context) {
        var cache, event, list;
        // 回调函数不存在，直接返回
        if (!callback) return this;

        // 将对象的`__events`属性缓存，`__events`属性不存在则初始化为空对象
        cache = this.__events || (this.__events = {});
        // 将参数中的事件字符串进行分割，得到事件名数组
        events = events.split(eventSplitter);

        // 循环遍历`events`中的事件
        while (event = events.shift()) {
            // 查询cache中是否缓存了事件，如果有，取得这个事件的回调函数队列的引用，如果没有，初始化为空数组
            list = cache[event] || (cache[event] = []);
            // 将回调和上下文存入回调函数队列
            list.push(callback, context)
        }

        return this
    };

    // 绑定只执行一次就销毁的事件回调
    Events.prototype.once = function(events, callback, context) {
        var that = this;
        // 对传入的`callback`进行一次封装，`cb`内调用`off`方法，调用一次就解绑
        var cb = function() {
            that.off(events, cb);
            callback.apply(context || that, arguments)
        };
        // 将封装后的`cb`进行绑定
        return this.on(events, cb, context)
    };

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    // 移除一个或多个回调，如果`context`为空，移除所有同名的回调。
    //如果`callback`为空，移除该事件上所有回调。
    //如果`events`为空，移除所有时间上绑定的所有回调函数。
    Events.prototype.off = function(events, callback, context){
        var cache, event, list, i;

        // No events, or removing *all* events.
        // 如果没有任何已绑定事件，直接返回
        if (!(cache = this.__events)) return this;
        // 如果三个参数都没传，则删除对象上的`__events`属性，并返回对象
        if (!(events || callback || context)) {
            delete this.__events;
            return this
        }

        // 对传入的`events`进行分割处理，如果没有传入`events`，取得缓存中的所有事件
        events = events ? events.split(eventSplitter) : keys(cache);

        // Loop through the callback list, splicing where appropriate.
        // 循环遍历events
        while (event = events.shift()) {
            // 保存事件回调队列
            list = cache[event];
            // 如队列为空，跳过
            if (!list) continue;

            // 如果`callback`和`context`都没传，则删除该事件队列
            if (!(callback || context)) {
                delete cache[event];
                continue
            }

            // 遍历回调队列，注意每个回调和其调用上下文是间隔排列的，步长为2
            // 和传入的`callback`以及`context`比较，都符合的则将回调和调用上下文从数组中移除

            for (i = list.length - 2; i >= 0; i -= 2) {
                if (!(callback && list[i] !== callback ||

                    context && list[i + 1] !== context)) {
                    list.splice(i, 2)
                }
            }
        }

        return this
    };


    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    Events.prototype.trigger = function(events) {
        var cache, event, all, list, i, len, rest = [], args, returned = true;
        // 如果没有绑定过任何事件，直接返回
        if (!(cache = this.__events)) return this;

        // 分割
        events = events.split(eventSplitter);

        // Fill up `rest` with the callback arguments.  Since we're only copying
        // the tail of `arguments`, a loop is much faster than Array#slice.
        // 将除第一个参数`events`外的所有参数保存保存为数组存入`rest`
        for (i = 1, len = arguments.length; i < len; i++) {
            rest[i - 1] = arguments[i]
        }

        // For each event, walk through the list of callbacks twice, first to
        // trigger the event, then to trigger any `"all"` callbacks.
        // 对于每个事件，遍历两次回调队列，第一次是触发那个事件，第二次是触发任何`all`事件的回调
        while (event = events.shift()) {
            // Copy callback lists to prevent modification.
            // 如果缓存中存在all事件，将其回调队列分割存入all
            if(cache.all) {
                if (all = cache.all) all = all.slice()
            }
            // 如果缓存中有当前遍历到的事件，将其回调队列分割存入list
            if (list = cache[event]) list = list.slice();

            // Execute event callbacks except one named "all"
            // 当遍历到的事件名不是all时，触发事件的所有回调，以this作为调用上下文
            if (event !== 'all') {
                returned = triggerEvents(list, rest, this) && returned
            }

            // Execute "all" callbacks.
            // 触发对应all事件的所有回调
            returned = triggerEvents(all, [event].concat(rest), this) && returned
        }

        // 返回值
        return returned
    };

    // trigger == emit
    Events.prototype.emit = Events.prototype.trigger;

    // Mix `Events` to object instance or Class function.
    Events.mixTo = function(receiver) {
        receiver = isFunction(receiver) ? receiver.prototype : receiver;
        var proto = Events.prototype;

        for (var p in proto) {
            if (proto.hasOwnProperty(p)) {
                receiver[p] = proto[p]
            }
        }
    };


    // Helpers
    // -------
    // 保存对`Object.keys`方法的引用

    var keys = Object.keys;




    if (!keys) {
        // 接受一个对象，返回该对象所有自有属性
        keys = function(o) {
            var result = [];

            for (var name in o) {
                if (o.hasOwnProperty(name)) {
                    result.push(name)
                }
            }
            return result
        }
    }

    // Execute callbacks
    /**
     * 执行回调的方法
     * @param {Array} list 回调函数队列
     * @param {Array} args 参数数组
     * @param {Object} context 调用上下文
     * @return {Boolean} pass
     */
    function triggerEvents(list, args, context) {
        var pass = true;

        if (list) {
            var i = 0, l = list.length, a1 = args[0], a2 = args[1], a3 = args[2];
            // call is faster than apply, optimize less than 3 argu
            // http://blog.csdn.net/zhengyinhui100/article/details/7837127
            // 由于`call`方法要比`apply`快，因此针对参数数量少于等于3个的情况进行优化，调用`call`，参数数量大于3个时调用`apply`
            switch (args.length) {
                case 0: for (; i < l; i += 2) {pass = list[i].call(list[i + 1] || context) !== false && pass} break;
                case 1: for (; i < l; i += 2) {pass = list[i].call(list[i + 1] || context, a1) !== false && pass} break;
                case 2: for (; i < l; i += 2) {pass = list[i].call(list[i + 1] || context, a1, a2) !== false && pass} break;
                case 3: for (; i < l; i += 2) {pass = list[i].call(list[i + 1] || context, a1, a2, a3) !== false && pass} break;
                default: for (; i < l; i += 2) {pass = list[i].apply(list[i + 1] || context, args) !== false && pass} break;
            }
        }
        // trigger will return false if one of the callbacks return false
        // 有一个回调函数的返回值为false则pass值为false
        return pass;
    }

    // 判断是否为Function类型的工具函数
    function isFunction(func) {
        return Object.prototype.toString.call(func) === '[object Function]'
    }

    return Events
});