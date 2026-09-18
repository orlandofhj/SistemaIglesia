package com.iglesiadelacalle.sistemaiglesia.models;

import java.time.LocalDate;
import jakarta.persistence.*;

@Entity
@Table(name = "planificacion")
public class Planificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idPlanificacion;

    @Column(name = "contenido_evaluar", nullable = false)
    private String contenidoEvaluar; 

    @Column(nullable = false)
    private Integer escala; 

    @Column(nullable = false)
    private Integer ponderacion; 

    // ⚡ FECHA ÚNICA PARA LA EVALUACIÓN
    @Column(name = "fecha_planif", nullable = false)
    private LocalDate fechaPlanif;

    @ManyToOne
    @JoinColumn(name = "id_clase_teologia", nullable = false)
    private ClaseTeologia claseTeologia;

    @ManyToOne
    @JoinColumn(name = "id_actividad", nullable = false)
    private Actividad actividad;

    @ManyToOne
    @JoinColumn(name = "id_tema", nullable = false)
    private Tema tema;

    // --- GETTERS Y SETTERS ---
    public Integer getIdPlanificacion() { return idPlanificacion; }
    public void setIdPlanificacion(Integer idPlanificacion) { this.idPlanificacion = idPlanificacion; }

    public String getContenidoEvaluar() { return contenidoEvaluar; }
    public void setContenidoEvaluar(String contenidoEvaluar) { this.contenidoEvaluar = contenidoEvaluar; }

    public Integer getEscala() { return escala; }
    public void setEscala(Integer escala) { this.escala = escala; }

    public Integer getPonderacion() { return ponderacion; }
    public void setPonderacion(Integer ponderacion) { this.ponderacion = ponderacion; }

    public LocalDate getFechaPlanif() { return fechaPlanif; }
    public void setFechaPlanif(LocalDate fechaPlanif) { this.fechaPlanif = fechaPlanif; }

    public ClaseTeologia getClaseTeologia() { return claseTeologia; }
    public void setClaseTeologia(ClaseTeologia claseTeologia) { this.claseTeologia = claseTeologia; }

    public Actividad getActividad() { return actividad; }
    public void setActividad(Actividad actividad) { this.actividad = actividad; }

    public Tema getTema() { return tema; }
    public void setTema(Tema tema) { this.tema = tema; }
}