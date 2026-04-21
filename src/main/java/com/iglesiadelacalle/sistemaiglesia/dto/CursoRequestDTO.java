package com.iglesiadelacalle.sistemaiglesia.dto;

import java.util.List;

public class CursoRequestDTO {

    private Integer idBloque;
    private Integer idInstructor;
    private List<Integer> estudiantesIds;

    // --- GETTERS Y SETTERS ---

    public Integer getIdBloque() {
        return idBloque;
    }

    public void setIdBloque(Integer idBloque) {
        this.idBloque = idBloque;
    }

    public Integer getIdInstructor() {
        return idInstructor;
    }

    public void setIdInstructor(Integer idInstructor) {
        this.idInstructor = idInstructor;
    }

    public List<Integer> getEstudiantesIds() {
        return estudiantesIds;
    }

    public void setEstudiantesIds(List<Integer> estudiantesIds) {
        this.estudiantesIds = estudiantesIds;
    }
}