var User = function(pJY) {
	this.userInfo = null;
	this.pJY = pJY;
	this.userid = 0;
	this.nickname = "";
};
/**
 * 获取用户信息
 */
User.prototype.getInfo = function() {
	var _this = this;
	this.pJY.post("/api/user/info", {}, function(info_res) {
                var version_time = window.localStorage.getItem('version_time');
                if(version_time){
                    if(typeof(res.time)!='undefined'&&typeof(res.version_time)!='undefined'
                            &&version_time <= res.version_time&&typeof(window.interactObj.ClearCache)!='undefined'){
                        window.interactObj.ClearCache();
                        window.localStorage.setItem('version_time',res.time);
                        window.location.reload();
                    }
                }else if(typeof(res.time)!='undefined'){
                    window.localStorage.setItem('version_time', res.time);
                }
		if (info_res.status == 200) {
			console.log(info_res);
			_this.userInfo = info_res.data.user_info;
			_this.userid = _this.userInfo.sn_user_id;
			_this.nickname = _this.userInfo.nickname;
                        localStoSetPrev(_this.userInfo.sn_user_id);
			$("#hostname").attr("userid", _this.userid);
			$("#hostname").attr("hostname", _this.nickname);
			if (_this.userInfo.headimgurl == null) {
				$("#avatar").attr("src", "img/avatar_vul.png")
			} else {
				$("#avatar").attr("src", _this.userInfo.headimgurl)
			}
		}else{
                    localStoSetPrev(0);
                }
                jy.chat.loadPrev();
	}, false);
};
/**
 * 好友申请
 * @param {integer} to_user_id
 * @param {string} message
 */
User.prototype.applyFriend = function(to_user_id, message) {
	var json = {
		type: "h5_to_ms",
		data: {
			key: "apply_friend",
			info: {
				to_user_id: to_user_id,
				message: message
			}
		}
	};
	this.pJY.interactObj.H5MsgToMs(JSON.stringify(json), function(arg) {
		console.log('apply_friend:' + arg);
	});
};
/**
 * 同意好友申请
 * @param {integer} apply_friend_id
 */
User.prototype.agreeFriend = function(apply_friend_id) {
	var json = {
		type: "h5_to_ms",
		data: {
			key: "agree_friend",
			info: {
				apply_friend_id: apply_friend_id
			}
		}
	};
	this.pJY.interactObj.H5MsgToMs(JSON.stringify(json), function(arg) {
		console.log('agree_friend:' + arg);
	});
};
/**
 * 删除好友
 * @param {integer} friend_user_id
 */
User.prototype.delFriend = function(friend_user_id) {
	var json = {
		type: "h5_to_ms",
		data: {
			key: "del_friend",
			info: {
				friend_user_id: friend_user_id
			}
		}
	};
	this.pJY.interactObj.H5MsgToMs(JSON.stringify(json), function(arg) {
		console.log('del_friend:' + arg);
	});

};
/**
 * 拒绝好友申请
 * @param {integer} friend_user_id
 */
User.prototype.refuseFriend = function(apply_friend_id) {
	var json = {
		type: "h5_to_ms",
		data: {
			key: "refuse_friend",
			info: {
				apply_friend_id: apply_friend_id
			}
		}
	};
	this.pJY.interactObj.H5MsgToMs(JSON.stringify(json), function(arg) {
		console.log('refuse_friend:' + arg);
	});
};
/**
 * 发送消息
 * @param {integer} to_user_id
 * @param {string} message
 */
User.prototype.msgChat = function(to_user_id, message) {
	var json = {
		type: "h5_to_ms",
		data: {
			key: "msg_chat",
			info: {
				chat_room_id: 0,
				to_user_id: to_user_id,
				message: message
			}
		}
	};

	this.pJY.interactObj.H5MsgToMs(JSON.stringify(json), function(arg) {
		console.log('msg_chat:' + arg);
	});
};

User.prototype.logout = function() {
	this.pJY.get("/api/user/logout", {}, function(logout_res) {
		console.log(logout_res);
		if (logout_res.status == 200) {
			window.location.href = '/web/login.html';
		}
	});
};
//手机绑定
User.prototype.phoneBind=function(){
    var phone=$('.rebind_tele .bind_tele input').val();
    var code=$('.rebind_tele .bind_code input').val();
    var _this=this;
    this.pJY.post("/api/user/phoneBind", {phone:phone,code:code}, function(bind_res) {
		console.log(bind_res);
		if (bind_res.status == 200) {
			window.location.reload();
		} else {
			_this.pJY.erro_msg(bind_res.msg);
		}
	});
}
//qq绑定
User.prototype.qqBind=function(code){
    var _this = this;
    this.pJY.post("/api/user/qqBind", {code:code}, function (bind_res) {
        console.log(bind_res);
        if (bind_res.status == 200) {
            parent.window.location.reload();
        } else {
            _this.pJY.erro_msg(bind_res.msg);
        }
    });
}
//微信绑定
User.prototype.wxBind=function(code){
    var _this = this;
    this.pJY.post("/api/user/wechatBind", {code:code}, function (bind_res) {
        console.log(bind_res);
        if (bind_res.status == 200) {
            parent.window.location.reload();
        } else {
            _this.pJY.erro_msg(bind_res.msg);
        }
    });
}

//退出账号
$("#user_out").click(function() {
	jy.user.logout();
});

$(".bind_btn").click(function() {
	jy.user.phoneBind();
});
