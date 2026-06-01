class AttendanceEvent {
  final String eventId;
  final String userId;
  final String userName;
  final String deviceId;
  final DateTime timestamp;
  final double cosineScore;
  final bool livenessPassed;
  final double? padScore;
  final double? latencyMs;
  final double? gpsLat;
  final double? gpsLon;
  final String? notes;

  AttendanceEvent({
    required this.eventId,
    required this.userId,
    required this.userName,
    required this.deviceId,
    required this.timestamp,
    required this.cosineScore,
    required this.livenessPassed,
    this.padScore,
    this.latencyMs,
    this.gpsLat,
    this.gpsLon,
    this.notes,
  });

  Map<String, dynamic> toJson() => {
        'eventId': eventId,
        'userId': userId,
        'userName': userName,
        'deviceId': deviceId,
        'timestamp': timestamp.toIso8601String(),
        'cosineScore': cosineScore,
        'livenessPassed': livenessPassed,
        'padScore': padScore,
        'latencyMs': latencyMs,
        'gpsLat': gpsLat,
        'gpsLon': gpsLon,
        'notes': notes,
      };

  factory AttendanceEvent.fromJson(Map<String, dynamic> json) {
    return AttendanceEvent(
      eventId: json['eventId'] as String,
      userId: json['userId'] as String,
      userName: json['userName'] as String,
      deviceId: json['deviceId'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      cosineScore: (json['cosineScore'] as num).toDouble(),
      livenessPassed: json['livenessPassed'] as bool,
      padScore: (json['padScore'] as num?)?.toDouble(),
      latencyMs: (json['latencyMs'] as num?)?.toDouble(),
      gpsLat: (json['gpsLat'] as num?)?.toDouble(),
      gpsLon: (json['gpsLon'] as num?)?.toDouble(),
      notes: json['notes'] as String?,
    );
  }
}
