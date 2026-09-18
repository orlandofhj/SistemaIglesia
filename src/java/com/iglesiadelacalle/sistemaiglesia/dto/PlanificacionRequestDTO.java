package com.iglesiadelacalle.sistemaiglesia.dto;

import java.time.LocalDate;
import java.util.List;

public class PlanificacionRequestDTO {

    private Integer idClaseTeologia;
    private List<EvaluacionDTO> evaluaciones;

    public Integer getIdClaseTeologia() { return idClaseTeologia; }
    public void setIdClaseTeologia(Integer idClaseTeologia) { this.idClaseTeologia = idClaseTeologia; }

    public List<EvaluacionDTO> getEvaluaciones() { return evaluaciones; }
    public void setEvaluaciones(List<EvaluacionDTO> evaluaciones) { this.evaluaciones = evaluaciones; }

    public static class EvaluacionDTO {
        private String contenidoEvaluar;
        private Integer escala;
        private Integer ponderacion;
        private LocalDate fechaPlanif; // ⚡ Fecha Única
        private ActividadRef actividad;

        public String getContenidoEvaluar() { return contenidoEvaluar; }
        public void setContenidoEvaluar(String contenidoEvaluar) { this.contenidoEvaluar = contenidoEvaluar; }

        public Integer getEscala() { return escala; }
        public void setEscala(Integer escala) { this.escala = escala; }

        public Integer getPonderacion() { return ponderacion; }
        public void setPonderacion(Integer ponderacion) { this.ponderacion = ponderacion; }

        public LocalDate getFechaPlanif() { return fechaPlanif; }
        public void setFechaPlanif(LocalDate fechaPlanif) { this.fechaPlanif = fechaPlanif; }

        public ActividadRef getActividad() { return actividad; }
        public void setActividad(ActividadRef actividad) { this.actividad = actividad; }
    }

    public static class ActividadRef {
        private Integer idActividad;
        public Integer getIdActividad() { return idActividad; }
        public void setIdActividad(Integer idActividad) { this.idActividad = idActividad; }
    }
}