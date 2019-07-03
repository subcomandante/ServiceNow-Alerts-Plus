chrome.browserAction.setBadgeText({
    text: "Wait"
});

var type,
    priority,
    $currentNumberTickets,
    $currentNumberTask,
    $currentNumberTotal,
    $ticketNumberGlobal,
    $idleState,
    $rootURL,
    $queueData,
    $taskData,
    newStamp = 0,
    totalCount;

if ($idleState == undefined) {
    $idleState = "active"
}
if ($currentNumberTickets == undefined) {
    $currentNumberTickets = 0
}
if ($currentNumberTask == undefined) {
    $currentNumberTask = 0
}
if ($currentNumberTotal == undefined) {
    $currentNumberTotal = 0
}

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install") {
        chrome.tabs.create({
            'url': 'chrome://extensions/?options=' + chrome.runtime.id
        });
    }
    getSavedData();
});

chrome.alarms.create("CheckTicketsAlarm", {
    delayInMinutes: 1,
    periodInMinutes: 1
});

chrome.alarms.onAlarm.addListener(function(info, tab) {
    getSavedData();
});


function getSavedData() {
    chrome.storage.sync.get(['rooturl', 'secondary', 'primary', 'splitcount','repeatAlert'], getQueues);
    //  chrome.storage.sync.get(null, function (data) { console.info(data) });

}

function getQueues(items) {
    var primaryURL = changeURLforGetXML(items.primary),
        secondaryURL = changeURLforGetXML(items.secondary),
        count = 0;
				$rootURL = items.rooturl;
    if (primaryURL != undefined && primaryURL != "") {
        count += 1
    }
    if (secondaryURL != undefined && secondaryURL != "") {
        count += 1
    }
    if (count > 0) {
        if (count == 1) {

            var data = getData(primaryURL);
            totalCount = data['quantity'];
            if ($currentNumberTotal < totalCount) {
                $ticketNumberGlobal = data['number'];
                showNotification(data['number'], data['description'], data['severity'])
            }

            chrome.browserAction.setBadgeText({
                text: ((data['quantity'])).toString()
            });
            $currentNumberTotal = totalCount


            // handle request for 1 field
        } else if (count == 2) {
            //var updateAlert = "false";
            var data1 = getData(primaryURL);
            var data2 = getData(secondaryURL);
            totalCount = (data1['quantity'] + data2['quantity']);
            if (items.repeatAlert == "true") {
                if (data1['quantity'] > 0) {
                    //updateAlert="true";
                    showNotification(data1['number'], data1['description'], data1['severity'])
                }
            }else if ($currentNumberTotal < totalCount) {
                if (data1.timestamp > data2.timestamp) {
                    if (data1.timestamp > newStamp) {
                        newStamp = data1.timestamp;
                        $ticketNumberGlobal = data1['number'];
                        showNotification(data1['number'], data1['description'], data1['severity'])
                        if (items.splitcount == "true") {
                            chrome.browserAction.setBadgeText({
                                text: (data1['quantity']).toString() + " | " + (data2['quantity']).toString()
                            });
                        } else {
                            chrome.browserAction.setBadgeText({
                                text: ((data1['quantity']) + (data2['quantity'])).toString()
                            });
                        }
                    }
                } else {
                    if (data2.timestamp > newStamp) {
                        newStamp = data2.timestamp;
                        $ticketNumberGlobal = data2['number'];
                        showNotification(data2['number'], data2['description'], data2['severity'])

                    }
                }
            }
            if (items.splitcount == "true") {
                chrome.browserAction.setBadgeText({
                    text: (data1['quantity']).toString() + " | " + (data2['quantity']).toString()
                });
            } else {
                chrome.browserAction.setBadgeText({
                    text: (totalCount).toString()
                });
            }
            $currentNumberTotal = totalCount;
            //handle request for 2 fields
        }
    }
}



function getData(url) {
    var $BadgeCount
    var timestamps = [];
    var oldest = [];
    var dataOutput;
    $.ajax({
        type: "get",
        url: url,
        async: false,
        dataType: "xml",
        success: function(data) {
            $queueData = $(data);
        },
        error: function(xhr, status) {
            chrome.browserAction.setBadgeText({
                text: "X"
            });
        }
    })
    var $qTickets = $queueData.children().children().length;
    var max = 0;
    if ($qTickets > 0) {
        $queueData.children().children().each(function() {
            var $qticketNumber = $(this).find('number').text();
            if ($qticketNumber.indexOf("TASK") != -1) {
                var $qseverity = "10";
            } else if ($qticketNumber.indexOf("CHG") != -1) {
                var $qseverity = "15";
            } else {
                var $qseverity = $(this).find("priority").text();
            }
            var $qticketDescription = $(this).find("short_description").text();
            var time = $(this).find("sys_updated_on").text();
            var d1 = new Date(time);
            var qtime = parseInt(d1.getTime());
            var dataOutput1 = {
                "quantity": $qTickets,
                "number": $qticketNumber,
                "severity": $qseverity,
                "description": $qticketDescription,
                "timestamp": qtime
            }
            if (qtime > max) {
                max = qtime;
                dataOutput = dataOutput1;
                oldest.push(max);
            }
        })
    } else {
        var dataOutput1 = {
            "quantity": 0,
            "number": null,
            "severity": null,
            "description": null,
            "timestamp": 0
        }
				dataOutput = dataOutput1;

    }
    var output = Math.max(oldest);
    return dataOutput;
}


// function querySNOW(items) {
//     var $BadgeCount;
//     var searchURL = changeURLforGetXML(items.primary)
//     var searchTaskURL = changeURLforGetXML(items.secondary)
//     $.ajax({
//         type: "get",
//         url: searchURL,
//         async: false,
//         dataType: "xml",
//         success: function(data) {
//             $queueData = $(data);
//         },
//         error: function(xhr, status) {
//             chrome.browserAction.setBadgeText({
//                 text: "X"
//             });
//         }
//
//     })
//     $.ajax({
//         type: "get",
//         url: searchTaskURL,
//         async: false,
//         dataType: "xml",
//         success: function(data) {
//             $taskData = $(data);
//         },
//         error: function(xhr, status) {
//             chrome.browserAction.setBadgeText({
//                 text: "X"
//             });
//         }
//     })
//
//     var $qTickets = $queueData.find("incident").length;
//     var $tTickets = $taskData.find("sc_task").length;
//     $BadgeCount = $qTickets + $tTickets;
//
//     //chrome.browserAction.setBadgeText({text: ($BadgeCount).toString()});
//     chrome.browserAction.setBadgeText({
//         text: ($qTickets).toString() + " |" + ($tTickets).toString()
//     });
//     var $qticketNumber = $queueData.find("incident").last().find("number")
//     var $tticketNumber = $taskData.find("sc_task").last().find("number")
//     var $qseverity = $queueData.find("incident").last().find("severity")
//     var $tseverity = $taskData.find("sc_task").last().find("priority")
//     var $qticketDescription = $queueData.find("incident").last().find("short_description")
//     var $tticketDescription = $taskData.find("sc_task").last().find("short_description")
//     var $qupdatedOn = $queueData.find("incident").last().find("sys_updated_on").text()
//     var d1 = new Date($qupdatedOn);
//     var qtime = parseInt(d1.getTime());
//     var $tupdatedOn = $taskData.find("sc_task").last().find("sys_updated_on").text()
//     var d2 = new Date($tupdatedOn);
//     var ttime = parseInt(d2.getTime());
//     var $qnumberUpdated = $qTickets
//     var $tnumberUpdated = $tTickets
//
//     if (qtime > ttime) {
//         $ticketNumber = $qticketNumber
//         $ticketDescription = $qticketDescription
//         $severity = $qseverity.text()
//     } else {
//         $ticketNumber = $tticketNumber
//         $ticketDescription = $tticketDescription
//         $severity = "10"
//     }
//
//     if (hasValue($currentNumberTickets) && ($BadgeCount > $currentNumberTickets) && ($BadgeCount > 0)) {
//         $ticketNumberGlobal = $ticketNumber.text()
//         showNotification($ticketNumber.text(), $ticketDescription.text(), $severity)
//     }
//     $currentNumberTickets = $BadgeCount
// }






function showNotification(ticketNumber, ticketDescription, severity) {
    var imageName
    switch (severity) {
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
        case "15":
            imageName = "change.png"
            break;
        default:
            imageName = "ITSM128.png"
    }
    chrome.notifications.create('reminder', {
        type: 'basic',
        iconUrl: 'images/' + imageName,
        title: ticketNumber,
        message: ticketDescription,
        //requireInteraction: true,             // TODO: Persistent alert
    }, function(notificationId) {});
}


chrome.notifications.onClicked.addListener(notificationClicked);

function notificationClicked() {
	var urlTicketSearch;
	console.log($ticketNumberGlobal.substring(0,3));
	switch ($ticketNumberGlobal.substring(0,3)) {
			case "TAS":
					urlTicketSearch = $rootURL + "/sc_task.do?sys_id=" + $ticketNumberGlobal
					break;
			case "INC":
					urlTicketSearch = $rootURL + "/incident.do?sys_id=" + $ticketNumberGlobal
					break;
			case "REQ":
					urlTicketSearch = $rootURL + "/sc_request.do?sys_id=" + $ticketNumberGlobal
					break;
			case "CHG":
					urlTicketSearch = $rootURL + "/change_request.do?sys_id=" + $ticketNumberGlobal
					break;
			case "RIT":
					urlTicketSearch = $rootURL + "/sc_req_item.do?sys_id=" + $ticketNumberGlobal
					break;
			case "CAL":
					urlTicketSearch = $rootURL + "/new_call.do?sys_id=" + $ticketNumberGlobal
					break;
			default:
					urlTicketSearch = $rootURL + "/task_list.do?sysparm_query=numberLIKE" + $ticketNumberGlobal + "&sysparm_first_row=1&sysparm_view="
	}

	chrome.tabs.create({
	        'url': urlTicketSearch
	    })

}





function hasValue(item) {
    if ((item != undefined) && (item != NaN) && (item != null)) {
        return true
    }
    return false
}





function changeURLforGetXML(url) {
    index = url.indexOf("?")
    if (index == -1) {
        return undefined;
    }
    return url.slice(0, index + 1) + "XML&" + url.slice(index + 1, url.length)
}







chrome.idle.onStateChanged.addListener(function(state) {
    $idleState = state
})
