{{- define "defiyield-service.image" -}}
{{- if .Values.imageOverride }}
{{- .Values.imageOverride }}
{{- else }}
{{- .Values.image.registry }}/{{ .Values.application.name }}:{{ .Values.application.version }}
{{- end }}
{{- end }}

{{- define "defiyield-service.fullname" -}}
{{ .Values.application.name }}
{{- end }}

{{- define "defiyield-service.labels" -}}
app.kubernetes.io/name: {{ .Values.application.name }}
app.kubernetes.io/instance: {{ .Chart.Name }}-{{ .Values.application.environment }}
app.kubernetes.io/component: microservice
app.kubernetes.io/part-of: {{ .Chart.Name }}
app.kubernetes.io/managed-by: spinnaker
{{- end }}