package com.iglesiadelacalle.sistemaiglesia.dto;

import java.time.LocalDate;
import java.util.List;

public class CursoRequestDTO {

    private Integer idBloque;
    private Integer idInstructor;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private List<Integer> estudiantesIds;
    private String estado;
    private List<TipFechaDTO> fechasTips;

    // --- CLASE INTERNA PARA LAS FECHAS DE LOS TIPS ---
    public static class TipFechaDTO {
        private Integer idTip;
        private LocalDate fechaInicio;
        private LocalDate fechaFin;

        public Integer getIdTip() { return idTip; }
        public void setIdTip(Integer idTip) { this.idTip = idTip; }
        public LocalDate getFechaInicio() { return fechaInicio; }
        public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }
        public LocalDate getFechaFin() { return fechaFin; }
        public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
    }

    // --- GETTERS Y SETTERS ---
    public Integer getIdBloque() { return idBloque; }
    public void setIdBloque(Integer idBloque) { this.idBloque = idBloque; }

    public Integer getIdInstructor() { return idInstructor; }
    public void setIdInstructor(Integer idInstructor) { this.idInstructor = idInstructor; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }

    public List<Integer> getEstudiantesIds() { return estudiantesIds; }
    public void setEstudiantesIds(List<Integer> estudiantesIds) { this.estudiantesIds = estudiantesIds; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public List<TipFechaDTO> getFechasTips() { return fechasTips; }
    public void setFechasTips(List<TipFechaDTO> fechasTips) { this.fechasTips = fechasTips; }
}