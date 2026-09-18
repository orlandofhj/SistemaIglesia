package com.iglesiadelacalle.sistemaiglesia.dto;

import java.time.LocalDate;
import java.util.List;

public class ClaseTeologiaRequestDTO {

    private Integer idTeologia;
    private Integer idTema;
    private Integer idInstructor;
    private LocalDate fechaInicio;
    private LocalDate fechaFin;
    private List<Integer> estudiantesIds;
    private String estado;

    // --- GETTERS Y SETTERS ---
    public Integer getIdTeologia() { return idTeologia; }
    public void setIdTeologia(Integer idTeologia) { this.idTeologia = idTeologia; }

    public Integer getIdTema() { return idTema; }
    public void setIdTema(Integer idTema) { this.idTema = idTema; }

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
}