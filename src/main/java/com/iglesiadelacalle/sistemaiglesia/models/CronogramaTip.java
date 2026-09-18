package com.iglesiadelacalle.sistemaiglesia.models;

import jakarta.persistence.*;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "cronograma_tip")
public class CronogramaTip {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer idCronograma;

    @ManyToOne
    @JoinColumn(name = "id_curso", nullable = false)
    @JsonIgnore 
    private Curso curso;

    @ManyToOne
    @JoinColumn(name = "id_tip", nullable = false)
    private Tip tip;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    // --- GETTERS Y SETTERS ---
    public Integer getIdCronograma() { return idCronograma; }
    public void setIdCronograma(Integer idCronograma) { this.idCronograma = idCronograma; }

    public Curso getCurso() { return curso; }
    public void setCurso(Curso curso) { this.curso = curso; }

    public Tip getTip() { return tip; }
    public void setTip(Tip tip) { this.tip = tip; }

    public LocalDate getFechaInicio() { return fechaInicio; }
    public void setFechaInicio(LocalDate fechaInicio) { this.fechaInicio = fechaInicio; }

    public LocalDate getFechaFin() { return fechaFin; }
    public void setFechaFin(LocalDate fechaFin) { this.fechaFin = fechaFin; }
}