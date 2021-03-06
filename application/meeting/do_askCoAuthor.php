<?php /*
    Copyright 2015 Cédric Levieux, Parti Pirate

    This file is part of Congressus.

    Congressus is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Congressus is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Congressus.  If not, see <https://www.gnu.org/licenses/>.
*/

if (!isset($api)) exit();

include_once("config/database.php");
include_once("config/memcache.php");
require_once("engine/utils/SessionUtils.php");
require_once("engine/bo/AgendaBo.php");
require_once("engine/bo/CoAuthorBo.php");
require_once("engine/bo/MeetingBo.php");
require_once("engine/bo/MotionBo.php");
require_once("engine/bo/TrustLinkBo.php");
require_once("engine/bo/UserBo.php");
require_once("engine/bo/VoteBo.php");
require_once("engine/utils/EventStackUtils.php");

if (!SessionUtils::getUserId($_SESSION)) {
	echo json_encode(array("ko" => "ko", "message" => "must_be_connected"));
	exit();
}

require_once("engine/utils/LogUtils.php");
addLog($_SERVER, $_SESSION, null, $_POST);

$memcache = openMemcacheConnection();

$connection = openConnection();

$agendaBo   = AgendaBo::newInstance($connection, $config);
$meetingBo  = MeetingBo::newInstance($connection, $config);
$motionBo   = MotionBo::newInstance($connection, $config);
$coAuthorBo = CoAuthorBo::newInstance($connection, $config);
$trustLinkBo = TrustLinkBo::newInstance($connection, $config);

$meetingId = $_REQUEST["meetingId"];

$meeting = $meetingBo->getById($meetingId);

if (!$meeting) {
	echo json_encode(array("ko" => "ko", "message" => "meeting_does_not_exist"));
	exit();
}

// TODO Compute the key // Verify the key

if (false) {
	echo json_encode(array("ko" => "ko", "message" => "meeting_not_accessible"));
	exit();
}

$userId = SessionUtils::getUserId($_SESSION);

$pointId = $_REQUEST["pointId"];
$agenda = $agendaBo->getById($pointId);

if (!$agenda || $agenda["age_meeting_id"] != $meeting[$meetingBo->ID_FIELD]) {
	echo json_encode(array("ko" => "ko", "message" => "agenda_point_not_accessible"));
	exit();
}

$agenda["age_objects"] = json_decode($agenda["age_objects"]);

// Get motion
$motion = $motionBo->getById($_REQUEST["motionId"]);
if (!$motion) {
	echo json_encode(array("ko" => "ko", "message" => "motion_does_not_exist"));
	exit();
}

//$memberId = intval($userData);

$coAuthor = array();
$coAuthor["cau_user_id"] = $userId;
$coAuthor["cau_object_type"] = "motion";
$coAuthor["cau_object_id"] = $motion[$motionBo->ID_FIELD];

$trustLinks = $trustLinkBo->getByFilters(array("tli_from_member_id" => $motion["mot_author_id"], "tli_to_member_id" => $userId, "tli_status" => TrustLinkBo::LINK));

$trusted = false;

if (count($trustLinks)) {
    $rights = json_decode($trustLinks[0]["tli_rights"], true);

    $trusted = isset($rights["authoring"]) && $rights["authoring"];
}

if ($trusted) {
    $coAuthor["cau_status"] = CoAuthorBo::AUTHORING;
}
else {
    $coAuthor["cau_status"] = CoAuthorBo::ASKING;
}

$coAuthorBo->save($coAuthor);

$data = array("ok" => "ok", "coAuthor" => $coAuthor);

echo json_encode($data, JSON_NUMERIC_CHECK);
?>