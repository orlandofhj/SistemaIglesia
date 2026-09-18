package com.iglesiadelacalle.sistemaiglesia.dto;

import java.util.List;

public class EvaluacionTipRequestDTO {

    private Integer idCurso;
    private Integer idActividad; // Corresponde al ID del Tip
    private List<NotaEstudianteDTO> notas;

    // --- CLASE INTERNA PARA LAS NOTAS ---
    public static class NotaEstudianteDTO {
        private Integer idEstudiante;
        private Boolean aprobado;

        public Integer getIdEstudiante() { return idEstudiante; }
        public void setIdEstudiante(Integer idEstudiante) { this.idEstudiante = idEstudiante; }
        public Boolean getAprobado() { return aprobado; }
        public void setAprobado(Boolean aprobado) { this.aprobado = aprobado; }
    }

    // --- GETTERS Y SETTERS ---

    public Integer getIdCurso() {
        return idCurso;
    }

    public void setIdCurso(Integer idCurso) {
        this.idCurso = idCurso;
    }

    public Integer getIdActividad() {
        return idActividad;
    }

    public void setIdActividad(Integer idActividad) {
        this.idActividad = idActividad;
    }

    public List<NotaEstudianteDTO> getNotas() {
        return notas;
    }

    public void setNotas(List<NotaEstudianteDTO> notas) {
        this.notas = notas;
    }
}