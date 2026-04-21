package com.iglesiadelacalle.sistemaiglesia.models;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "planificacion")
public class Planificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idPlanificacion;

    @Column(nullable = false)
    private Integer escala;

    @Column(nullable = false)
    private Integer ponderacion;

    @Column(name = "fecha_planif")
    private LocalDate fechaPlanif;

    // --- LLAVES FORÁNEAS ---
    @ManyToOne
    @JoinColumn(name = "id_tema", nullable = false)
    private Tema tema;

    @ManyToOne
    @JoinColumn(name = "id_actividad", nullable = false)
    private Actividad actividad;

    public Integer getIdPlanificacion() {
        return idPlanificacion;
    }

    public void setIdPlanificacion(Integer idPlanificacion) {
        this.idPlanificacion = idPlanificacion;
    }

    public Integer getEscala() {
        return escala;
    }

    public void setEscala(Integer escala) {
        this.escala = escala;
    }

    public Integer getPonderacion() {
        return ponderacion;
    }

    public void setPonderacion(Integer ponderacion) {
        this.ponderacion = ponderacion;
    }

    public LocalDate getFechaPlanif() {
        return fechaPlanif;
    }

    public void setFechaPlanif(LocalDate fechaPlanif) {
        this.fechaPlanif = fechaPlanif;
    }

    public Tema getTema() {
        return tema;
    }

    public void setTema(Tema tema) {
        this.tema = tema;
    }

    public Actividad getActividad() {
        return actividad;
    }

    public void setActividad(Actividad actividad) {
        this.actividad = actividad;
    }

    // TODO: Generar Getters y Setters
}