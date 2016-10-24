chrome.browserAction.setBadgeText({text: "Wait"});

var $currentNumberTickets
var $currentNumberTask
var $currentNumberTotal
var $ticketNumberGlobal
var $idleState
var $rootURL
var $queueData;
var $taskData;

if ($rootURL == undefined) {$rootURL = "https://chs.service-now.com"}
if ($idleState == undefined) {$idleState = "active"}
if ($currentNumberTickets == undefined) {$currentNumberTickets = 0}
if ($currentNumberTask == undefined) {$currentNumberTask = 0}
if ($currentNumberTotal == undefined) {$currentNumberTotal = 0}

function showNotification(ticketNumber,ticketDescription,severity) {
	var imageName
	switch(severity) {
		case "1":
			imageName = "Sev1.png"
			break;
		case "2":
			imageName = "Sev2.png"
			break;
		case "3":
			imageName = "Sev3.png"
			break;
		case "4":
			imageName = "Sev4.png"
			break;
			case "10":
				imageName = "ServiceRequest.png"
				break;
		default:
			imageName = "ITSM128.png"
	}
    chrome.notifications.create('reminder', {
        type: 'basic',
        iconUrl: 'images/' + imageName,
        title: ticketNumber,
        message: ticketDescription
     }, function(notificationId) {});
}


chrome.notifications.onClicked.addListener(notificationClicked);
function notificationClicked () {
	if($ticketNumberGlobal.startsWith("TASK")){
	var urlTicketSearch = $rootURL + "/sc_task.do?sys_id=" + $ticketNumberGlobal
	chrome.tabs.create({'url':urlTicketSearch})
}else {
	var urlTicketSearch = $rootURL + "/incident.do?sys_id=" + $ticketNumberGlobal
	chrome.tabs.create({'url':urlTicketSearch})
}
}

chrome.alarms.create("CheckTicketsAlarm", {delayInMinutes: 1, periodInMinutes: 1});

chrome.alarms.onAlarm.addListener(function(info, tab) {
	getGroupsSaved()
});

function getAssignmentGroupById (AGroupId) {
	var $group = ""
	$(function() {
    $.ajax({
        type: "get",
        url: $rootURL + "/sys_user_group.do?XML&sys_id=" + AGroupId,
        dataType: "xml",
		async: false,
        success: function(data) {
			var $allxml = $(data)
			$group = $allxml.find("sys_user_group").find("name").text()
        },
        error: function(xhr, status) {
            $group = "error"
        }
		});
	});
	return $group
}
function getLog(items){
	console.log(items.rootURL);
	console.log(items.secondary);
	console.log(items.primary);
}

function getGroupsSaved() {
	chrome.storage.sync.get(['rootURL','secondary','primary'], loadPendingTasks );
	// chrome.storage.sync.get(null, function (data) { console.info(data) });

}

function removeOtherGroups(xml,groups) {
	$.each( $(xml).find("incident"), function (index, value) {
		var $ticketAGroupId = $(value).find("assignment_group")
		var ticketAGroup = getAssignmentGroupById($ticketAGroupId.text())
		tag = ticketAGroup.toLowerCase()
		g = groups.toLowerCase()
		if (tag.indexOf(g) == -1) {
			$(this).remove();
		}
	})

	return xml
}

function hasValue (item) {
	if ((item != undefined) && (item != NaN) && (item != null)) {return true}
	return false
}

function loadTickesFromSearchURL (items) {
	var $BadgeCount;
	var searchURL = changeURLforGetXML(items.primary)
	var searchTaskURL = changeURLforGetXML(items.secondary)
	$.ajax({
        type: "get",
        url: searchURL,
				async: false,
        dataType: "xml",
        success: function(data) {
					$queueData = $(data);
				},
				error: function(xhr, status) {
						chrome.browserAction.setBadgeText({text: "X"});
				}

			})
			$.ajax({
		        type: "get",
		        url: searchTaskURL,
						async: false,
		        dataType: "xml",
		        success: function(data) {
							$taskData = $(data);
						},
						error: function(xhr, status) {
								chrome.browserAction.setBadgeText({text: "X"});
						}
			})
			var $qTickets = $queueData.find("incident").length;
			var $tTickets = $taskData.find("sc_task").length;

			$BadgeCount = $qTickets + $tTickets;
			//chrome.browserAction.setBadgeText({text: ($BadgeCount).toString()});
			chrome.browserAction.setBadgeText({text: ($qTickets).toString() + " |" + ($tTickets).toString()});
			var $qticketNumber = $queueData.find("incident").last().find("number")
			var $tticketNumber = $taskData.find("sc_task").last().find("number")
			var $qseverity = $queueData.find("incident").last().find("severity")
			var $tseverity = $taskData.find("sc_task").last().find("priority")
			var $qticketDescription = $queueData.find("incident").last().find("short_description")
			var $tticketDescription = $taskData.find("sc_task").last().find("short_description")
			var $qupdatedOn = $queueData.find("incident").last().find("sys_updated_on").text()
			var d1 = new Date($qupdatedOn);
			var qtime = parseInt(d1.getTime());
			var $tupdatedOn = $taskData.find("sc_task").last().find("sys_updated_on").text()
			var d2 = new Date($tupdatedOn);
			var ttime = parseInt(d2.getTime());
			var $qnumberUpdated = $qTickets
			var $tnumberUpdated = $tTickets

			if(qtime > ttime){
				$ticketNumber = $qticketNumber
				$ticketDescription= $qticketDescription
				$severity =  $qseverity.text()
			}else {
				$ticketNumber = $tticketNumber
				$ticketDescription= $tticketDescription
				$severity =  "10"
			}

			if (hasValue($currentNumberTickets) && ($BadgeCount > $currentNumberTickets) && ($BadgeCount > 0)) {
				$ticketNumberGlobal = $ticketNumber.text()
				showNotification($ticketNumber.text(),$ticketDescription.text(), $severity)
			}
			$currentNumberTickets = $BadgeCount



}

function changeURLforGetXML(url) {
	index = url.indexOf("?")
	return url.slice(0,index+1) + "XML&" + url.slice(index+1,url.length)
}



function loadPendingTasks(items) {

	//console.log($idleState);
	//console.log(items.primary);
	if ($idleState != "locked") {
		if (items.primary != undefined && items.primary != "") {
			loadTickesFromSearchURL(items)
			// loadtaskTickesFromSearchURL(items)
		} else {
			//chrome.storage.sync.get(null, function (data) { console.info(data) });
		}
	}
}

chrome.runtime.onInstalled.addListener(function(details){
	if(details.reason == "install"){
		chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
	}
	getGroupsSaved()
});

chrome.idle.onStateChanged.addListener(function (state) {
	$idleState = state
	})
