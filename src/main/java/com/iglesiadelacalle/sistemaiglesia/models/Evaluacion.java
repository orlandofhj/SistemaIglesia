package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "evaluacion")
public class Evaluacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idEvaluacion;

    @Column(nullable = false)
    private Integer puntuacion;

    // --- LLAVES FORÁNEAS ---
    @ManyToOne
    @JoinColumn(name = "id_pastor", nullable = false)
    private Persona pastor;

    @ManyToOne
    @JoinColumn(name = "id_tema", nullable = false)
    private Tema tema;

    @ManyToOne
    @JoinColumn(name = "id_estudiante", nullable = false)
    private Persona estudiante;

    public Integer getIdEvaluacion() {
        return idEvaluacion;
    }

    public void setIdEvaluacion(Integer idEvaluacion) {
        this.idEvaluacion = idEvaluacion;
    }

    public Integer getPuntuacion() {
        return puntuacion;
    }

    public void setPuntuacion(Integer puntuacion) {
        this.puntuacion = puntuacion;
    }

    public Persona getPastor() {
        return pastor;
    }

    public void setPastor(Persona pastor) {
        this.pastor = pastor;
    }

    public Tema getTema() {
        return tema;
    }

    public void setTema(Tema tema) {
        this.tema = tema;
    }

    public Persona getEstudiante() {
        return estudiante;
    }

    public void setEstudiante(Persona estudiante) {
        this.estudiante = estudiante;
    }

    // TODO: Generar Getters y Setters
}