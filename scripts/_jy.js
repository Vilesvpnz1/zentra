var JYSDK = function () {
    this.interactObj = null;
    this.host = '';
    this.user = new User();
    this.chat = new ChatStorage();
    this.asHost = '';
    this.rtHost = '';
    this.setWeb = false;
    this.platform = 1;
    this.defaultUrl = '';
}

/**
 * 初始化
 */
JYSDK.prototype.initObj = function () {
    var _this = this;
    var channel = new Channel();
    _this.interactObj = channel.interactObj;
    _this.rtHost = window.location.protocol+'//'+window.location.host;
    _this.asHost = "https://www.raccoongame.com";
//    _this.setUserToken(_this.getCookie('as_user_token'));
    this.defaultUrl = this.rtHost + '/wap/dist/#/platform/cloudgame/gameindex';
    var reg_android_set = new RegExp("SettingPage");
    if (reg_android_set.test(navigator.userAgent)) {
        _this.setWeb = true;
    }
    var reg_ios = new RegExp("RaccoonGame/ios");
    if (reg_ios.test(navigator.userAgent)) {
        _this.platform = 2;
        this.defaultUrl = this.rtHost + '/wap/dist/#/platform/room/roomlist';
    }
};
/**
 * 人工验证
 * @param {string} str
 */
JYSDK.prototype.conManualVerify = function (str) {
    var _this = this;
    var data = JSON.parse(str);
    //连接提醒
    _this.post('/api/device/getApplyCon', data, function (con_res) {
        if (con_res.status == 200) {
            if (confirm('用户：【' + con_res.data.from_user.nickname + '】请求连接') == false) {
                _this.interactObj.RefuseApplyConnect(JSON.stringify({apply_connection_id: con_res.data.apply_connection_id,
                    device_id: con_res.data.from_user.device_id}), function (arg) {
                    console.log('拒绝连接', arg);
                });
            } else {
                _this.interactObj.AgreeApplyConnect(JSON.stringify({apply_connection_id: con_res.data.apply_connection_id,
                    device_id: con_res.data.from_user.device_id}), function (arg) {
                    console.log('同意连接', arg);
                });
            }

        }
    });
};
/**
 * 密码验证
 * @param {string} str
 */
JYSDK.prototype.conPasswdVerify = function (str) {
    var _this = this;
    var data = JSON.parse(str);
    //连接提醒
    _this.post('/api/device/getApplyCon', data, function (con_res) {
        if (con_res.status == 200) {
            //连接密码验证
        }
    });
};
/**
 * 设置用户token
 * @param {string} user_token
 */
JYSDK.prototype.setUserToken = function (user_token) {
    var str = JSON.stringify({
        user_token: user_token
    });
    this.interactObj.SetUserToken(str);
};
/**
 * 节点是否在窗口中显示
 * @param {object} $p
 */
JYSDK.prototype.curPos = function ($p) {
    var top = $p.offset().top;
    var scrollH = $(window).scrollTop();
    if (scrollH < top && scrollH + this.winH > top) {
        return true;
    } else {
        return false;
    }
};
/**
 * 获取cookie值
 * @param {string} cookie_name
 * @returns {string}
 */
JYSDK.prototype.getCookie = function (cookie_name) {
    var arr, reg = new RegExp("(^| )" + cookie_name + "=([^;]*)(;|$)");
    if (arr = document.cookie.match(reg))
        return unescape(arr[2]);
    else
        return null;
//    var allcookies = document.cookie;
//    var cookie_pos = allcookies.indexOf(cookie_name);
//    if (cookie_pos != -1) {
//        cookie_pos = cookie_pos + cookie_name.length + 1;
//        var cookie_end = allcookies.indexOf(";", cookie_pos);
//        if (cookie_end == -1) {
//            cookie_end = allcookies.length;
//        }
//        var value = unescape(allcookies.substring(cookie_pos, cookie_end));
//    }
//    return value;
};
/**
 * 消息接收
 * @param {object} json
 */
// var newsmath = 0;
// JYSDK.prototype.receive = function (json) {
//     console.log('消息接收：', json);
//     if (json.key == "msg_chat") {
//         this.chat.chatMessage(json);
//     } else if (json.key == 'apply_friend') {
//         next_id = 0;
//     } else if (json.key == 'agree_friend') {

//     } else if (json.key == 'agree_friend_ack') {

//     } else if (json.key == 'del_friend') {
//         erromsg = "你已经被" + json.nickname + "移除好友";
//         jy.erro_msg(erromsg);
//     } else if (json.key == 'del_friend_ack') {
//     }
//     ;
// };


function apidecode(string, sn, key) {
    string = decodeURIComponent(string);
    var ckey_length = 8;
    key = md5(key);
    var keya = md5(key);
    var keyb = md5(sn);
    var keyc = string.substr(0, ckey_length);
    var cryptkey = keya + md5(keya + keyc);
    var key_length = cryptkey.length;
    string = window.atob(string.slice(ckey_length));
    var string_length = string.length;
    var result = '';
    var box = [];
    for (var i = 0; i <= 255; i++) {
        box.push(i);
    }
    var rndkey = [];
    for (i = 0; i < 256; i++) {
        rndkey.push((cryptkey.substr(i % key_length, 1)).charCodeAt());
    }
    var tmp = '';
    for (var j = i = 0; i < 256; i++) {
        j = (j + box[i] + rndkey[i]) % 256;
        tmp = box[i];
        box[i] = box[j];
        box[j] = tmp;
    }
    for (var a = j = i = 0; i < string_length; i++) {
        a = (a + 1) % 256;
        j = (j + box[a]) % 256;
        tmp = box[a];
        box[a] = box[j];
        box[j] = tmp;
        result += String.fromCharCode(((string.substr(i, 1)).charCodeAt()) ^ (box[(box[a] + box[j]) % 256]));
    }
    if ((result.substr(0, 10) == 0 || result.substr(0, 10) - Math.floor(Date.parse(new Date()) / 1000) > 0) && result.substr(10, 16) == md5(result.slice(26) + keyb).substr(0, 16)) {
        return decodeURIComponent(Base64._utf8_decode(result.slice(26)));
    } else {
        return '';
    }
}