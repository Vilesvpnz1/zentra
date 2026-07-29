var ChatStorage = function () {
    this.prev = window.localStorage.getItem('prev');
    if (!this.prev) {
        this.prev = 0;
    }
};
ChatStorage.prototype.loadPrev = function () {
    this.prev = window.localStorage.getItem('prev');
    if (!this.prev) {
        this.prev = 0;
    }
};
var localStorage = window.localStorage;
ChatStorage.prototype.prefixInteger = function (num, m) {
    return (Array(m).join(0) + num).slice(-m);
}
//聊天保存记录
ChatStorage.prototype.chatMessage = function (json) {
    var time = new Date(json.send_time);
    var key_name = '@' + this.prev + '@chat_message:' + json.chat_user_id + ':' + time.getFullYear() + "" + (this.prefixInteger(time.getMonth() + 1, 2))
            + "" + this.prefixInteger(time.getDate(), 2);
    var data_str = localStorage.getItem(key_name);
    var data = [];
    if (data_str) {
        data = JSON.parse(data_str);
    }
    data.push(json);
    localStorage.setItem(key_name, JSON.stringify(data));
    return true;
};
//聊天列表获取
ChatStorage.prototype.getList = function (chat_user_id, next_date) {
    var date_list = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key_str = localStorage.key(i);
        var reg = new RegExp('@' + this.prev + '@chat_message:' + chat_user_id + ':');
        if (reg.test(key_str)) {
            var tdate = key_str.replace('@' + this.prev + '@chat_message:' + chat_user_id + ':', '');
            if (next_date > 0 && tdate >= next_date) {
                continue;
            } else {
                date_list.push(parseInt(tdate));
            }
        }
    }
    if (date_list.length > 0) {
        date_list = date_list.sort();
        var adate = date_list.pop();
        var key_name = '@' + this.prev + '@chat_message:' + chat_user_id + ':' + adate;
        var data_str = localStorage.getItem(key_name);
        var data = [];
        if (data_str) {
            data = JSON.parse(data_str);
        }
        return {list: data, next_date: adate};
    } else {
        return {list: [], next_date: next_date};
    }
};
//聊天查找
ChatStorage.prototype.search = function (chat_user_id, content) {
    var date_list = [];
    var list = [];
    for (var i = 0; i < localStorage.length; i++) {
        var key_str = localStorage.key(i);
        var reg = new RegExp('@' + this.prev + '@chat_message:' + chat_user_id + ':');
        if (reg.test(key_str)) {
            var tdate = key_str.replace('@' + this.prev + '@chat_message:' + chat_user_id + ':', '');
            date_list.push(tdate);
        }
    }
    if (date_list.length > 0) {
        date_list = date_list.sort();
        var reg_content = new RegExp(content);
        for (var l = 0; l < date_list.length; l++) {
            var adate = date_list[l];
            var key_name = '@' + this.prev + '@chat_message:' + chat_user_id + ':' + adate;
            var data_str = localStorage.getItem(key_name);
            var data = [];
            if (data_str) {
                data = JSON.parse(data_str);
            }
            $.each(data, function (k, v) {
                if (reg_content.test(v.message)) {
                    list.push(v);
                }
            })
        }
    }
    return {list: list};
};
//聊天清空
ChatStorage.prototype.clear = function (chat_user_id) {
    for (var i = 0; i < localStorage.length; i++) {
        var key_str = localStorage.key(i);
        var reg = new RegExp('@' + this.prev + '@chat_message:' + chat_user_id + ':');
        if (reg.test(key_str)) {
            localStorage.removeItem(key_str);
        }
    }
    return true;
};