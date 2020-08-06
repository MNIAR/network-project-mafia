// server.js
var express = require('express');
var app = express();
var http = require('http').Server(app); 
var io = require('socket.io')(http);    
var path = require('path');

var userExist = new Array(0,0,0,0,0,0,0,0);
var howManyUser = 0; 
var gameStatus = 0;		// 0: 대기, 1: 낮, 2: 낮 투표, 3: 최종 변론, 4: 밤, 5: 결과 출력

var mafia_cnt = 2;
var citizen_cnt = 6;
var total_cnt = 8;

var mafia_target = 100;                             // 선택이 누구인지, default : 100 -> target이 100이면 return;
var police_target = 100;
var police_check = 0;
var doctor_target = 50;

var userRole = new Array(1, 1, 1, 1, 1, 1, 1, 1);   // 사망: 0, 시민: 1, 마피아: 2, 경찰: 3, 의사: 4
var mpd_index = new Array(100, 100, 100, 100);      // 맢,맢,경,의 index

var checkNext_cnt = 0;
var checkNext = new Array(0, 0, 0, 0, 0, 0, 0, 0);

var vote = new Array(0, 0, 0, 0, 0, 0, 0, 0);       // 득표수
var vote_cnt = 0;                                   // 투표인원수
var max_index = 100;								// 최다 득표자


// playGame

const init = () => {
	mafia_cnt = 2;
	citizen_cnt = 6;
	total_cnt = 8;
	mafia_target = 100;
	police_target = 100;
	police_check = 0;
	doctor_target = 50;
	checkNext_cnt = 0;
	vote_cnt = 0;
	max_index = 100;
	for (var i = 0; i < 8; i++) {
		userRole[i] = 1;
		checkNext[i] = 0;
		vote[i] = 0;
	}
	giveRole();
}

const substrUserNum = (name) => {
    return parseInt(name.substring(2, 3)) - 1;
}

// 역할 부여
const giveRole = () => {
    var random = 0;
    // 중복 제거 랜덤값 로직
    for (var i = 0; i < 4; i++) {
        random = Math.floor(Math.random() * 8);
        for (var j = 0; j < 4; j++) {
            if (mpd_index[j] == random && i != j) {
                i--;
                break;
            }
            mpd_index[i] = random;
        }
    }
    userRole[mpd_index[0]] = 2;
    userRole[mpd_index[1]] = 2;
    userRole[mpd_index[2]] = 3;
    userRole[mpd_index[3]] = 4;
}


const voteWho = (vote_num) => {
	vote[vote_num]++;        // 득표자 득표수 +1
	vote_cnt++;       	     // 투표인원수 +1
	console.log(vote_num + " " + vote_cnt + " " + total_cnt)
	if (vote_cnt == total_cnt) {    // 투표 ㅇㅋ시
		// 최대 득표 구하기
		var max = 0;
		for (var i = 0; i < 8; i++) {
			if (vote[i] > max) {
				max = vote[i];
				max_index = i;
			}
		}
		console.log(max_index);
		for (var i = 0; i < 8; i++) {
			if (max_index == i) continue;
			if (max == vote[i]) {
				console.log("max: " + max);
				console.log("vote[i]: " + vote[i]);
				
				max = 0;
				vote_cnt = 0;
				for (var i = 0; i < 8; i++) {
					vote[i] = 0;
				}
				return 2;
			}
		}
		if (userRole[max_index] == 2) {
			mafia_cnt--;
			total_cnt--;
			console.log("mafia_cnt: " + mafia_cnt);
			console.log("citizen_cnt: " + citizen_cnt);
			console.log("total_cnt: " + total_cnt);
			console.log("userRole[max_index]: " + userRole[max_index]);
			userRole[max_index] = 0;
			console.log("userRole[max_index]: " + userRole[max_index]);
		}
		else {
			citizen_cnt--;
			total_cnt--;
			console.log("mafia_cnt: " + mafia_cnt);
			console.log("citizen_cnt: " + citizen_cnt);
			console.log("total_cnt: " + total_cnt);
			console.log("userRole[max_index]: " + userRole[max_index]);
			userRole[max_index] = 0;
			console.log("userRole[max_index]: " + userRole[max_index]);
		}
		max = 0;
		vote_cnt = 0;
		for (var i = 0; i < 8; i++) {
			vote[i] = 0;
		}
		return "최다득표자 : 익명" + (max_index + 1);
	}
};

const goNext = (num) => {
	var msg = result();
	if (msg != null) {
		gameStatus = 0;
		return msg;
	}
    if (gameStatus == 0) {
        gameStatus = 4;
		console.log("gameStatus: " + gameStatus);
		return ("밤이 되었습니다.");
	}
	if (checkNext[num] == 1 && (gameStatus == 1 || gameStatus == 4))
		return ("다음 턴으로 넘어가기 위한 '<ㅇㅋ>'는 한번만 입력해주세요.");
	else if (checkNext[num] == 1 && gameStatus == 2)
		return 1;
	
	checkNext[num] = 1;
	checkNext_cnt++;
	console.log(checkNext_cnt);
    if (checkNext_cnt == total_cnt) {
        switch (gameStatus) {
            case 1:
                gameStatus = 2;
				checkNext_cnt = 0;
				for (var i = 0; i < 8; i++) {
					checkNext[i] = 0;
				}
				console.log("gameStatus: " + gameStatus);
				return ("투표를 시작합니다.");				
            case 2:
                gameStatus = 4;
                checkNext_cnt = 0;
				for (var i = 0; i < 8; i++) {
					checkNext[i] = 0;
				}
				console.log("gameStatus: " + gameStatus);
                return ("밤이 되었습니다.");
            case 4:
                gameStatus = 1;
				checkNext_cnt = 0;
				for (var i = 0; i < 8; i++) {
					checkNext[i] = 0;
				}
				console.log("gameStatus: " + gameStatus);
                return ("아침이 밝았습니다.\n" + totalMoony());
        }
    }
}


// kill: 맢, find: 경, fix: 의
const killYou = (num_m) => {
    if (userRole[num_m] == 0) return "죽은 사람입니다.";          // 죽은 사람 선택시
	mafia_target = num_m;                                        // target 설정
};
const findYou = (num_p) => {
	if (userRole[police_target] == 0) return "죽은 사람입니다.";
	if (police_check == 1) return "하루에 한 명만 조사 가능합니다.";
	police_target = num_p;
	police_check = 1;
	if (police_target == mpd_index[0] || police_target == mpd_index[1]) return "익명" + (police_target + 1) + "은/는 마피아입니다.";       // 맢 조사시
    else return "익명" + (police_target + 1) + "은/는 시민입니다.";                                                                      // 시민 조사시
};
const fixYou = (num_d) => {
    if (userRole[num_d] == 0) return "죽은 사람입니다.";
    doctor_target = num_d;
};


// 밤 정리
const totalMoony = () => {
    console.log("맢 : %d,  경 : %d,  의 : %d", mafia_target, police_target, doctor_target);     // 관리자 확인
    if (mafia_target == doctor_target) {
        // 초기화
        mafia_target = 100;
		police_target = 100;
		police_check = 0;
        doctor_target = 50;
        return "***** Server : 의사의 도움으로 누군가가 살아났습니다.";    // saving
	}
	else if (mafia_target == 100) {
        mafia_target = 100;
        police_target = 100;
		police_check = 0;
        doctor_target = 50;
		return "***** Server : 고요한 밤이었습니다.";
	}
    else {
        // 마피아에게 마피아가
        if (userRole[mafia_target] == 2) {
            mafia_cnt--;                    // 맢수
            total_cnt--;                    // 인원수
			userRole[mafia_target] = 0;    // userrole 사망처리
			var r_m = "***** Server : 탕! 익명" + (mafia_target + 1) + "이/가 사망했습니다.";
        }
        // 마피아에게 시민이
        else {
            citizen_cnt--;                  // 시민수
            total_cnt--;
			userRole[mafia_target] = 0;    // userrole 사망처리			
			var r_m = "***** Server : 탕! 익명" + (mafia_target + 1) + "이/가 사망했습니다.";
        }
        mafia_target = 100;
        police_target = 100;
		police_check = 0;
		doctor_target = 50;
        return r_m;
    }
};


// 최종 결과
const result = () => {
	if (mafia_cnt >= citizen_cnt) {
		gameStatus = 0;
		return ("마피아 팀이 승리하였습니다.\n"
			+ "마피아 - 익명" + (mpd_index[0] + 1) + "," + (mpd_index[1] + 1) + "\n"
			+ "경찰 - 익명" + (mpd_index[2] + 1) + "\n"
			+ "의사 - 익명" + (mpd_index[3] + 1));
	}
	else if (mafia_cnt == 0) {
		gameStatus = 0;
		return ("시민 팀이 승리하였습니다.\n"
			+ "마피아 - 익명" + (mpd_index[0] + 1) + "," + (mpd_index[1] + 1) + "\n"
			+ "경찰 - 익명" + (mpd_index[2] + 1) + "\n"
			+ "의사 - 익명" + (mpd_index[3] + 1));
	}
}



app.set('views', './views');
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
	res.render('chat');  // 루트 페이지로 접속시 chat.pug 렌더링
});

init();

io.on('connection', function (socket) {  // 채팅방에 접속했을 때 - 1
	if (howManyUser < 8) {
		console.log('user connected: ', socket.id);
		var emptyIndex = userExist.indexOf(0);				// 제일 처음 비어있는 자리
		userExist[emptyIndex] = 1;							// user exist : 1, non user : 0
		var name = "익명" + (parseInt(emptyIndex) + 1);		// index : 0 -> user(0+1) -> user1
		howManyUser++;										// user < 8
		socket.name = name;
		io.to(socket.id).emit('create name', name);
		if (substrUserNum(name) == mpd_index[0] || substrUserNum(name) == mpd_index[1]) {
			socket.join('mafia');
		}
		io.emit('new_connect', name);
		
		socket.on('disconnect', function () {   // 채팅방 접속이 끊어졌을 때 - 2
			console.log('user disconnected: ' + socket.id + ' ' + socket.name);
			howManyUser--;
			var whoIsExit = substrUserNum(socket.name);
			userExist[whoIsExit] = 0;
			io.emit('new_disconnect', socket.name);
		});
	}
	else {
		console.log('audience connected: ', socket.id);
		socket.name = "관전";
		io.to(socket.id).emit('create name', name);
		socket.join('mafia');
		socket.join('soul');
			
		socket.on('disconnect', function () {   // 채팅방 접속이 끊어졌을 때 - 2
			console.log('user disconnected: ' + socket.id + ' ' + socket.name);
		});
	}

	if (socket.name != "관전") {
		socket.on('send message', function (name, text) {
			var result_message = result();
			if (text == "") { /*ㅋㅋ*/ }
			else if (gameStatus == 0) {
				if (text == "<ㄱㄱ>") {
					if (name == "익명1" && howManyUser >= 8) {
						io.emit('server message', "게임을 시작하겠습니다.");
						var change_message = goNext();
						socket.leave('mafia');
						socket.leave('soul');
						io.emit('server message', change_message);
					}
					else if (name == "익명1" && howManyUser < 8) {
						io.emit('server message', "게임 인원이 부족합니다.\n***** Server : 시작 인원수 : 8");
					}
					else if (name != "익명1") {
						io.emit('server message', "<ㄱㄱ> 권한은 '익명1' 유저에게만 있습니다.");
					}
				}
				else {
					var msg = name + ' : ' + text;
					socket.name = name;
					io.emit('receive message', msg);
				}
			}
			else if (gameStatus == 2) {
				if (userRole[substrUserNum(socket.name)] == 0) {
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to("soul").emit('receive message', msg);
				}
				else if (text == "<1>" || text == "<2>" || text == "<3>" || text == "<4>" || text == "<5>" || text == "<6>" || text == "<7>" || text == "<8>") {
					if (userRole[parseInt(text.substring(1, 2)) - 1] == 0) {
						io.to(socket.id).emit('server message', "죽은 사람입니다.");
					}
					else {
						var goNext_message1 = goNext(substrUserNum(socket.name));
						if (goNext_message1 == null) {
							var vote_message = voteWho(parseInt(text.substring(1, 2)) - 1);
							io.emit('server message', "익명" + (parseInt(text.substring(1, 2)) - 1 + 1) + " 득표");
						}
						else if (goNext_message1 == 1) {
							io.emit('server message', "투표는 한번만 할 수 있습니다.");
						}
						else {
							var vote_message = voteWho(parseInt(text.substring(1, 2)) - 1);
							if (vote_message == 2) {
								io.emit('server message', "익명" + (parseInt(text.substring(1, 2)) - 1 + 1) + " 득표");
								io.emit('server message', "최다득표자가 두 명 이상 나왔습니다.");
								io.emit('server message', "투표를 통한 사형없이 다음턴으로 넘어갑니다.");
								gameStatus = 4;
								checkNext_cnt = 0;
								for (var i = 0; i < 8; i++) {
									checkNext[i] = 0;
								}
								io.emit('server message', "밤이 되었습니다.");
							}
							else {
								io.emit('server message', "익명" + (parseInt(text.substring(1, 2)) - 1 + 1) + " 득표");
								io.emit('server message', vote_message);
								io.emit('server message', "사형이 집행되었습니다.");
								if (result() == null)
									io.emit('server message', goNext_message1);
								else {
									io.emit('server message', "게임이 끝났습니다.");
									io.emit('server message', result());
									init();
								}
							}
						}

					}
				}
				else {
					io.to(socket.id).emit('server message', "투표를 하기 위해서는 <(숫자)> 형태로 입력해주세요.");
				}
			}
			else if (gameStatus == 4) {
				if (userRole[substrUserNum(socket.name)] == 0) {		// 사망자끼리
					socket.leave('mafia');
					socket.join('soul');
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to("soul").emit('receive message', msg);
				}
				else if (substrUserNum(name) == mpd_index[0] || substrUserNum(name) == mpd_index[1]) {	// 맢끼리
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to("mafia").emit('receive message', msg);
					io.to("soul").emit('receive message', msg);
					if (text == "<1>" || text == "<2>" || text == "<3>" || text == "<4>" || text == "<5>" || text == "<6>" || text == "<7>" || text == "<8>") {
						console.log("mafia " + text)
						var killYou_message = killYou(parseInt(text.substring(1, 2)) - 1);
						if (killYou_message != null) {
							io.to('mafia').emit('server message', killYou_message);
							io.to('soul').emit('server message', socket.name + " - " + '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택.");
							io.to('soul').emit('server message', killYou_message);
						}
						else if (killYou_message == null) {
							io.to('mafia').emit('server message', '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택 완료.");
							io.to('soul').emit('server message', socket.name + " - " + '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택.");
						}
					}
					if (text == "<ㅇㅋ>") {
						var goNext_message_m = goNext(substrUserNum(name));
						if (goNext_message_m != null) {
							io.emit('server message', goNext_message_m);
							var result_message_m = result();
							if (result_message_m != null) {
								io.emit('server message', "게임이 끝났습니다.");
								io.emit('server message', result_message_m);
								init();
							}
						}
					}
				}
				else if (substrUserNum(name) == mpd_index[2]) {
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to(socket.id).emit('receive message', msg);
					io.to("soul").emit('receive message', msg);
					if (text == "<1>" || text == "<2>" || text == "<3>" || text == "<4>" || text == "<5>" || text == "<6>" || text == "<7>" || text == "<8>") {
						console.log("police " + text)
						var findYou_message = findYou(parseInt(text.substring(1, 2)) - 1);
						io.to(socket.id).emit('server message', findYou_message);
						io.to('soul').emit('server message', socket.name + " - " + '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택.");
						io.to('soul').emit('server message', findYou_message);
					}
					if (text == "<ㅇㅋ>") {
						var goNext_message_p = goNext(substrUserNum(name));
						if (goNext_message_p != null) {
							io.emit('server message', goNext_message_p);
							var result_message_p = result();
							if (result_message_p != null) {
								io.emit('server message', "게임이 끝났습니다.");
								io.emit('server message', result_message_p);
								init();
							}
						}
					}
				}
				else if (substrUserNum(name) == mpd_index[3]) {
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to(socket.id).emit('receive message', msg);
					io.to("soul").emit('receive message', msg);
					if (text == "<1>" || text == "<2>" || text == "<3>" || text == "<4>" || text == "<5>" || text == "<6>" || text == "<7>" || text == "<8>") {
						console.log("doctor " + text)
						var fixYou_message = fixYou(parseInt(text.substring(1, 2)) - 1);
						if (fixYou_message != null) {
							io.to(socket.id).emit('server message', fixYou_message);
							io.to('soul').emit('server message', socket.name + " - " + '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택.");
							io.to('soul').emit('server message', fixYou_message);
						}
						else if (fixYou_message == null) {
							io.to(socket.id).emit('server message', '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택 완료.");
							io.to('soul').emit('server message', socket.name + " - " + '익명' + (parseInt(text.substring(1, 2)) - 1 + 1) + "번 선택.");
						}
					}
					if (text == "<ㅇㅋ>") {
						var goNext_message_d = goNext(substrUserNum(name));
						if (goNext_message_d != null) {
							io.emit('server message', goNext_message_d);
							var result_message_d = result();
							if (result_message_d != null) {
								io.emit('server message', "게임이 끝났습니다.");
								io.emit('server message', result_message_d);
								init();
							}
						}
					}
						
				}
				else {
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to(socket.id).emit('receive message', msg);
					io.to("soul").emit('receive message', msg);
					if (text == "<ㅇㅋ>") {
						var s1 = goNext(substrUserNum(name));
						if (s1 != null) {
							io.emit('server message', s1);
							var result_message_t = result();
							console.log(result_message_t)
							if (result_message_t != null) {
								io.emit('server message', "게임이 끝났습니다.");
								io.emit('server message', result_message_t);
								init();
							}
						}
					}
				}
				if (text == "<ㅇㅎ>") {
					switch (userRole[substrUserNum(socket.name)]) {
						case 1:
							io.to(socket.id).emit('server message', "당신은 시민입니다.");
							break;
						case 2:
							io.to(socket.id).emit('server message', "당신은 마피아입니다.");
							break;
						case 3:
							io.to(socket.id).emit('server message', "당신은 경찰입니다.");
							break;
						case 4:
							io.to(socket.id).emit('server message', "당신은 의사입니다.");
							break;
						default:
							break;
					}
				}
			}
			else {		// gameStatus: 1 - 낮
				if (userRole[substrUserNum(socket.name)] == 0) {		// 사망자끼리
					socket.join('soul');
					var msg = name + ' : ' + text;
					socket.name = name;
					io.to("soul").emit('receive message', msg);
				}
				else {
					var msg = name + ' : ' + text;
					socket.name = name;
					io.emit('receive message', msg);
					io.to("soul").emit('receive message', msg);
					if (text == "<ㅇㅋ>") {
						var s1 = goNext(substrUserNum(name));
						if (s1 != null) {
							io.emit('server message', s1);
						}
					}
				}
			}
		});
	}
});


http.listen(3000, function(){ 
	console.log('server on..');
});