package com.iglesiadelacalle.sistemaiglesia.dto;

import java.util.List;

public class ClaseTeologiaRequestDTO {

    private Integer idTeologia;
    private Integer idInstructor;
    private List<Integer> estudiantesIds;
    private String estado;

    // --- GETTERS Y SETTERS ---

    public Integer getIdTeologia() { return idTeologia; }
    public void setIdTeologia(Integer idTeologia) { this.idTeologia = idTeologia; }

    public Integer getIdInstructor() { return idInstructor; }
    public void setIdInstructor(Integer idInstructor) { this.idInstructor = idInstructor; }

    public List<Integer> getEstudiantesIds() { return estudiantesIds; }
    public void setEstudiantesIds(List<Integer> estudiantesIds) { this.estudiantesIds = estudiantesIds; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}