class FaceTemplate {
  final String id;
  final String userId;
  final String name;
  final List<double> embedding;
  final int createdAt;

  FaceTemplate({
    required this.id,
    required this.userId,
    required this.name,
    required this.embedding,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'name': name,
        'embedding': embedding,
        'createdAt': createdAt,
      };

  factory FaceTemplate.fromJson(Map<String, dynamic> json) {
    return FaceTemplate(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      embedding: (json['embedding'] as List<dynamic>)
          .map((e) => (e as num).toDouble())
          .toList(),
      createdAt: json['createdAt'] as int,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'user_id': userId,
        'name': name,
        'embedding': embedding.join(','),
        'created_at': createdAt,
      };

  factory FaceTemplate.fromMap(Map<String, dynamic> map) {
    final embeddingStr = map['embedding'] as String;
    return FaceTemplate(
      id: map['id'] as String,
      userId: map['user_id'] as String,
      name: map['name'] as String,
      embedding: embeddingStr.isEmpty
          ? []
          : embeddingStr.split(',').map((e) => double.parse(e)).toList(),
      createdAt: map['created_at'] as int,
    );
  }
}
