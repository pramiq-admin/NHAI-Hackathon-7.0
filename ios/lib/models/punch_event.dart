class PunchEvent {
  final String id;
  final String type;
  final DateTime timestamp;
  final double? gpsLat;
  final double? gpsLon;
  final double? gpsAccuracy;
  final double? faceMatchScore;
  final bool livenessPassed;
  final String deviceId;
  final int synced;

  PunchEvent({
    required this.id,
    required this.type,
    required this.timestamp,
    this.gpsLat,
    this.gpsLon,
    this.gpsAccuracy,
    this.faceMatchScore,
    required this.livenessPassed,
    required this.deviceId,
    required this.synced,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'timestamp': timestamp.toIso8601String(),
        'gpsLat': gpsLat,
        'gpsLon': gpsLon,
        'gpsAccuracy': gpsAccuracy,
        'faceMatchScore': faceMatchScore,
        'livenessPassed': livenessPassed,
        'deviceId': deviceId,
        'synced': synced,
      };

  factory PunchEvent.fromJson(Map<String, dynamic> json) {
    return PunchEvent(
      id: json['id'] as String,
      type: json['type'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      gpsLat: (json['gpsLat'] as num?)?.toDouble(),
      gpsLon: (json['gpsLon'] as num?)?.toDouble(),
      gpsAccuracy: (json['gpsAccuracy'] as num?)?.toDouble(),
      faceMatchScore: (json['faceMatchScore'] as num?)?.toDouble(),
      livenessPassed: json['livenessPassed'] as bool,
      deviceId: json['deviceId'] as String,
      synced: json['synced'] as int,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'type': type,
        'timestamp': timestamp.toIso8601String(),
        'gps_lat': gpsLat,
        'gps_lon': gpsLon,
        'gps_accuracy': gpsAccuracy,
        'face_match_score': faceMatchScore,
        'liveness_passed': livenessPassed ? 1 : 0,
        'device_id': deviceId,
        'synced': synced,
      };

  factory PunchEvent.fromMap(Map<String, dynamic> map) {
    return PunchEvent(
      id: map['id'] as String,
      type: map['type'] as String,
      timestamp: DateTime.parse(map['timestamp'] as String),
      gpsLat: (map['gps_lat'] as num?)?.toDouble(),
      gpsLon: (map['gps_lon'] as num?)?.toDouble(),
      gpsAccuracy: (map['gps_accuracy'] as num?)?.toDouble(),
      faceMatchScore: (map['face_match_score'] as num?)?.toDouble(),
      livenessPassed: (map['liveness_passed'] as int) == 1,
      deviceId: map['device_id'] as String,
      synced: map['synced'] as int,
    );
  }
}
